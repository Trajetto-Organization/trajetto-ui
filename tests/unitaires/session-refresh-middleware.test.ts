// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import middleware from "@/middleware";
import { refreshAnswerEndsSession } from "@/lib/session-renewal";
import { apiForwardingHeaders } from "@/lib/api-forwarding";

// A refresh token of its own per request: the middleware shares one renewal
// among requests racing on the same refresh token and keeps its answer for
// a few seconds, and each case here is a session of its own.
let session = 0;
const nextSession = () => (session += 1);

/**
 * What the middleware does when the access token has expired.
 *
 * Two defects met here. Any answer other than 200 to the refresh — a 429, a
 * 503 during a deploy, a dropped connection — logged the person out and
 * deleted their cookies, so a hiccup of the API became a mass logout. And the
 * refresh was sent from this server with nothing saying which browser it was
 * for, so the API counted every web user as one address and started answering
 * 429 with ordinary traffic — which the first defect then turned into logouts.
 */
const SECRET = "s".repeat(40);

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const expiredAccess = jwt({
  role: "BUSINESS_ADMIN",
  exp: Math.floor(Date.now() / 1000) - 60,
});

function requestFor(path = "/dashboard", extra: Record<string, string> = {}) {
  return new NextRequest(`http://app.test${path}`, {
    headers: {
      cookie: `tkey=${expiredAccess}; rkey=refresh-token-${nextSession()}`,
      "x-forwarded-for": "10.0.0.9, 189.40.1.7",
      ...extra,
    },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  process.env.RATE_LIMIT_FORWARDER_SECRET = SECRET;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Whether the response deletes the session cookies. */
function clearsSession(response: Response): boolean {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies.some((cookie) => /^(tkey|rkey)=;/.test(cookie));
}

describe("a refresh the API could not complete", () => {
  it.each([
    ["busy (429)", () => new Response("{}", { status: 429 })],
    ["failing (503)", () => new Response("{}", { status: 503 })],
    ["erroring (500)", () => new Response("{}", { status: 500 })],
  ])("keeps the session when the API is %s", async (_label, answer) => {
    fetchMock.mockResolvedValue(answer());

    const response = await middleware(requestFor());

    expect(response.headers.get("location")).toBeNull();
    expect(clearsSession(response)).toBe(false);

    // The page is told the renewal is pending, so it shows the reconnection
    // screen instead of treating the expired token's 401 as a verdict.
    expect(response.headers.get("x-middleware-request-x-session-renewal")).toBe(
      "pending",
    );
  });

  it("keeps the session when the API does not answer at all", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await middleware(requestFor());

    expect(response.headers.get("location")).toBeNull();
    expect(clearsSession(response)).toBe(false);
  });
});

describe("a refresh the API refused", () => {
  it("ends the session", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    const response = await middleware(requestFor());

    expect(response.headers.get("location")).toContain("/login");
    expect(clearsSession(response)).toBe(true);
  });
});

describe("the refresh call itself", () => {
  it("says which browser it is made for", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));

    await middleware(requestFor());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    // The LAST hop of X-Forwarded-For: what the proxy in front saw.
    expect(headers["x-trajetto-client-ip"]).toBe("189.40.1.7");
    expect(headers["x-trajetto-forwarder-secret"]).toBe(SECRET);
  });
});

describe("the headers handed to the page", () => {
  it("drops a renewal flag the browser tried to send itself", async () => {
    const fresh = jwt({
      role: "BUSINESS_ADMIN",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const response = await middleware(
      new NextRequest("http://app.test/dashboard", {
        headers: {
          cookie: `tkey=${fresh}; rkey=refresh-token-${nextSession()}`,
          "x-session-renewal": "pending",
        },
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      response.headers.get("x-middleware-request-x-session-renewal"),
    ).toBeNull();
  });

  it("delivers the pathname to the page on the REQUEST", async () => {
    const fresh = jwt({
      role: "BUSINESS_ADMIN",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const response = await middleware(
      new NextRequest("http://app.test/dashboard/vehicles", {
        headers: {
          cookie: `tkey=${fresh}; rkey=refresh-token-${nextSession()}`,
        },
      }),
    );

    // Set on the response only, it went to the browser and `headers()` in
    // the protected layout read an empty pathname.
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
      "/dashboard/vehicles",
    );
  });
});

describe("which answers end a session", () => {
  it("is the API saying no, never the API being unavailable", () => {
    for (const status of [400, 401, 403]) {
      expect(refreshAnswerEndsSession(status)).toBe(true);
    }

    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(refreshAnswerEndsSession(status)).toBe(false);
    }
  });
});

describe("forwarding headers", () => {
  it("are empty without the shared secret", () => {
    delete process.env.RATE_LIMIT_FORWARDER_SECRET;

    expect(
      apiForwardingHeaders(new Headers({ "x-forwarded-for": "189.40.1.7" })),
    ).toEqual({});
  });

  it("are empty when there is no address to vouch for", () => {
    expect(apiForwardingHeaders(new Headers())).toEqual({});
  });
});
