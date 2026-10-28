// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import middleware from "@/middleware";
import {
  CSP_REPORT_GROUP,
  CSP_REPORT_PATH,
} from "@/lib/content-security-policy";

/**
 * Where the middleware spends an API call, and which requests may end a
 * session.
 *
 * Three defects this pins:
 * - an expired access token was renewed on EVERY request the matcher covers:
 *   a visitor with old cookies browsing the landing page cost one
 *   POST /user/refresh-token per page, and every <Link> prefetch of a page
 *   full of links POSTed the same refresh token again;
 * - that refresh had no timeout, so a slow API held every navigation;
 * - `?force_logout=true` revoked the API session and deleted the cookies for
 *   any top-level navigation, a link on another site included.
 */
function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const expired = () =>
  jwt({ role: "BUSINESS_ADMIN", exp: Math.floor(Date.now() / 1000) - 60 });

const valid = () =>
  jwt({ role: "BUSINESS_ADMIN", exp: Math.floor(Date.now() / 1000) + 3600 });

// A refresh token of its own per request: the middleware shares one renewal
// among the requests racing on the same refresh token (and keeps its answer
// for a few seconds), and each case here is a session of its own.
let session = 0;

function requestFor(
  path: string,
  token: string,
  headers: Record<string, string> = {},
  method = "GET",
): NextRequest {
  session += 1;

  return new NextRequest(`http://app.test${path}`, {
    method,
    headers: {
      cookie: `tkey=${token}; rkey=refresh-token-${session}`,
      ...headers,
    },
  });
}

const fetchMock = vi.fn();
const env = { ...process.env };

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

const renewed = () =>
  new Response(
    JSON.stringify({ token: "new-access", refresh_token: valid() }),
    { status: 200 },
  );

function refreshCalls(): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.endsWith("/user/refresh-token"));
}

function clearsSession(response: Response): boolean {
  return (response.headers.getSetCookie?.() ?? []).some((cookie) =>
    /^(tkey|rkey)=;/.test(cookie),
  );
}

describe("an expired token on a public page", () => {
  it.each(["/", "/sobre", "/blog", "/docs", "/orcamento", "/api/health"])(
    "is not renewed on %s",
    async (path) => {
      const response = await middleware(requestFor(path, expired()));

      expect(refreshCalls()).toEqual([]);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("does not answer a public form's action POST with a logout", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    const response = await middleware(
      requestFor("/orcamento", expired(), { "next-action": "abc" }, "POST"),
    );

    expect(refreshCalls()).toEqual([]);
    expect(response.headers.get("location")).toBeNull();
    expect(clearsSession(response)).toBe(false);
  });
});

describe("an expired token where the session is used", () => {
  it.each([
    ["a protected page", "/dashboard/vehicles", {}, "GET"],
    ["an RSC navigation", "/admin/business", { rsc: "1" }, "GET"],
    ["a Server Action", "/dashboard", { "next-action": "abc" }, "POST"],
    ["the relay", "/api/relay/user/me", {}, "GET"],
    ["a sign-in page", "/login", {}, "GET"],
  ] as const)("is renewed on %s", async (_label, path, headers, method) => {
    fetchMock.mockResolvedValue(renewed());

    const response = await middleware(
      requestFor(path, expired(), headers, method),
    );

    expect(refreshCalls()).toHaveLength(1);
    expect(response.headers.getSetCookie().join("; ")).toContain(
      "tkey=new-access",
    );
  });

  it("waits a bounded time for the API", async () => {
    fetchMock.mockResolvedValue(renewed());

    await middleware(requestFor("/dashboard", expired()));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps the session when the renewal times out", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );

    const response = await middleware(requestFor("/dashboard", expired()));

    expect(response.headers.get("location")).toBeNull();
    expect(clearsSession(response)).toBe(false);
    expect(response.headers.get("x-middleware-request-x-session-renewal")).toBe(
      "pending",
    );
  });

  it("keeps the session when a 200 arrives without the tokens", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const response = await middleware(requestFor("/dashboard", expired()));

    expect(clearsSession(response)).toBe(false);
    expect(response.headers.get("x-middleware-request-x-session-renewal")).toBe(
      "pending",
    );
  });
});

describe("a prefetch", () => {
  it.each([
    ["the router's", { "next-router-prefetch": "1", rsc: "1" }],
    ["the browser's", { "sec-purpose": "prefetch" }],
    ["a legacy browser's", { purpose: "prefetch" }],
  ])("never renews the token (%s)", async (_label, headers) => {
    await middleware(requestFor("/sobre", expired(), headers));
    await middleware(requestFor("/dashboard/fuel", expired(), headers));

    expect(refreshCalls()).toEqual([]);
  });

  it("of a protected page is not rendered with the expired token", async () => {
    const response = await middleware(
      requestFor("/dashboard/fuel", expired(), {
        "next-router-prefetch": "1",
        rsc: "1",
      }),
    );

    // Not an RSC payload: the router falls back to a full navigation when
    // the link is clicked, and that request renews the token.
    expect(response.status).toBe(204);
    expect(clearsSession(response)).toBe(false);
  });

  it("of a protected page with a valid token goes through", async () => {
    const response = await middleware(
      requestFor("/dashboard/fuel", valid(), { "next-router-prefetch": "1" }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("force_logout", () => {
  it.each(["same-origin", "none"])(
    "is honoured when the browser says the navigation is the app's own (%s)",
    async (site) => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      const response = await middleware(
        requestFor("/login?force_logout=true&error=tenant_inactive", valid(), {
          "sec-fetch-site": site,
        }),
      );

      expect(response.headers.get("location")).toContain(
        "/login?reason=tenant_inactive",
      );
      expect(clearsSession(response)).toBe(true);
    },
  );

  it.each(["cross-site", "same-site", undefined])(
    "is ignored from another site (%s): no revocation, no cookie cleared",
    async (site) => {
      const response = await middleware(
        requestFor(
          "/login?force_logout=true&error=session_expired",
          valid(),
          site ? { "sec-fetch-site": site } : {},
        ),
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(clearsSession(response)).toBe(false);

      // Nor bounced to the dashboard, whose gate would redirect it back here.
      expect(response.headers.get("location")).toBeNull();
    },
  );
});

describe("Trusted Types", () => {
  it("are reported, never enforced, on pages and prerendered pages alike", async () => {
    for (const path of ["/dashboard", "/", "/blog"]) {
      const response = await middleware(requestFor(path, valid()));
      const reportOnly = response.headers.get(
        "content-security-policy-report-only",
      );

      expect(reportOnly).toContain("require-trusted-types-for 'script'");
      expect(reportOnly).toContain("trusted-types nextjs nextjs#bundler");
      expect(reportOnly).toContain(`report-uri ${CSP_REPORT_PATH}`);
      expect(reportOnly).toContain(`report-to ${CSP_REPORT_GROUP}`);

      // The enforced policy does not take the requirement on.
      expect(response.headers.get("content-security-policy")).not.toContain(
        "trusted-types",
      );
    }
  });

  it("names the reporting endpoint the policies point at", async () => {
    const response = await middleware(requestFor("/", valid()));

    expect(response.headers.get("reporting-endpoints")).toBe(
      `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`,
    );
  });

  it("never reach the request, where Next looks for the nonce", async () => {
    const response = await middleware(requestFor("/dashboard", valid()));

    expect(
      response.headers.get(
        "x-middleware-request-content-security-policy-report-only",
      ),
    ).toBeNull();
  });
});
