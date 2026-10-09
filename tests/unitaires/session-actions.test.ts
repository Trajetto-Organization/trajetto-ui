// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two Server Actions the browser calls about its own session. Being
 * actions, any script on the origin can call them: neither may return the
 * access token, only a one-use ticket or the token's claims.
 */
function jwt(claims: Record<string, unknown>): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${part({ alg: "HS256" })}.${part(claims)}.signature`;
}

let cookie: string | undefined;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "tkey" && cookie ? { value: cookie } : undefined,
  }),
}));

import { mintSocketTicket, readSessionClaims } from "@/actions/session";

const fetchMock = vi.fn();

beforeEach(() => {
  cookie = jwt({
    sub: "u-1",
    role: "BUSINESS_ADMIN",
    businessId: "b-1",
    driverId: null,
  });
  process.env.HTTP_REQUEST = "http://api.internal";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mintSocketTicket", () => {
  it("mints with the session token and returns only the ticket", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ticket: "t".repeat(43), expiresIn: 30 }, { status: 201 }),
    );

    const result = await mintSocketTicket();

    expect(result).toEqual({ ok: true, ticket: "t".repeat(43) });
    expect(JSON.stringify(result)).not.toContain(cookie as string);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe("http://api.internal/user/socket-ticket");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${cookie}`);
  });

  it("says 401 without a session, without calling the API", async () => {
    cookie = undefined;

    expect(await mintSocketTicket()).toEqual({
      ok: false,
      status: 401,
      code: "AUTH_TOKEN_MISSING",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hands the API's refusal back as a value", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { code: "AUTH_SESSION_INVALIDATED", message: "Sessão encerrada." },
        { status: 401 },
      ),
    );

    expect(await mintSocketTicket()).toEqual({
      ok: false,
      status: 401,
      code: "AUTH_SESSION_INVALIDATED",
    });
  });

  it("reads an unreachable API as transient, not as a verdict", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    expect(await mintSocketTicket()).toEqual({
      ok: false,
      status: 503,
      code: null,
    });
  });
});

describe("readSessionClaims", () => {
  it("returns the claims and never the token", async () => {
    const claims = await readSessionClaims();

    expect(claims).toEqual({
      userId: "u-1",
      role: "BUSINESS_ADMIN",
      businessId: "b-1",
      driverId: null,
    });
    expect(JSON.stringify(claims)).not.toContain("signature");
  });

  it("returns null without a session cookie", async () => {
    cookie = undefined;
    expect(await readSessionClaims()).toBeNull();
  });

  it("returns empty claims for a cookie that does not decode (the check then ends it)", async () => {
    cookie = "not-a-jwt";
    expect(await readSessionClaims()).toEqual({
      userId: null,
      role: null,
      businessId: null,
      driverId: null,
    });
  });
});
