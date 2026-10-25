// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import middleware, { config } from "@/middleware";

/**
 * The edge's routing rules left alive by the 06/10 mutation run (harness of
 * middleware-access-policy.test.ts): the forced logout, the sign-in pages
 * for someone already signed in, the private areas by role, the refresh of
 * an expired token, and which pages get a CSP nonce.
 */
function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const inAnHour = () => Math.floor(Date.now() / 1000) + 3600;

function sessionFor(
  role: string,
  driverId: string | null = null,
  exp = inAnHour(),
): string {
  return jwt({ role, driverId, exp });
}

function requestFor(
  path: string,
  token?: string,
  refresh = "refresh",
): NextRequest {
  return new NextRequest(`http://app.test${path}`, {
    headers: token ? { cookie: `tkey=${token}; rkey=${refresh}` } : {},
  });
}

const target = (response: Response) => {
  const location = response.headers.get("location");
  if (!location) return null;
  const url = new URL(location);
  return url.pathname + url.search;
};

const env = { ...process.env };
const fetchMock = vi.fn();

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

describe("forced logout", () => {
  it("goes to the sign-in page with the reason, clearing both cookies", async () => {
    const response = await middleware(
      requestFor(
        "/dashboard?force_logout=true&error=tenant_inactive",
        sessionFor("BUSINESS_USER"),
      ),
    );

    expect(target(response)).toBe("/login?reason=tenant_inactive");
    const cleared = response.headers.getSetCookie().join("; ");
    expect(cleared).toContain("tkey=;");
    expect(cleared).toContain("rkey=;");
  });

  it("says the session expired when no reason came", async () => {
    const response = await middleware(
      requestFor("/dashboard?force_logout=true"),
    );

    expect(target(response)).toBe("/login?reason=session_expired");
  });

  it("revokes the session on the API before deleting the cookies", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const token = sessionFor("BUSINESS_USER");

    const response = await middleware(
      requestFor("/login?force_logout=true&error=logout", token),
    );

    expect(target(response)).toBe("/login?reason=logout");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/user/logout");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("still logs out when the API revocation fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await middleware(
      requestFor(
        "/login?force_logout=true&error=permissions_changed",
        sessionFor("BUSINESS_USER"),
      ),
    );

    expect(target(response)).toBe("/login?reason=permissions_changed");
    expect(response.headers.getSetCookie().join("; ")).toContain("tkey=;");
  });

  it("calls nothing without an access token", async () => {
    await middleware(requestFor("/login?force_logout=true&error=logout"));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only on force_logout=true", async () => {
    const response = await middleware(
      requestFor("/dashboard?force_logout=1", sessionFor("BUSINESS_USER")),
    );

    expect(target(response)).toBeNull();
  });
});

describe("sign-in pages for someone already signed in", () => {
  it("send each role to its own home", async () => {
    for (const path of [
      "/login",
      "/forgot",
      "/forgot/password",
      "/new-verification",
    ]) {
      expect(
        target(await middleware(requestFor(path, sessionFor("MASTER")))),
      ).toBe("/admin");
    }
    expect(
      target(
        await middleware(
          requestFor("/login", sessionFor("BUSINESS_USER", "driver-1")),
        ),
      ),
    ).toBe("/profile");
    expect(
      target(
        await middleware(requestFor("/login", sessionFor("BUSINESS_USER"))),
      ),
    ).toBe("/dashboard");
    expect(
      target(
        await middleware(
          requestFor("/login", sessionFor("BUSINESS_ADMIN", "driver-1")),
        ),
      ),
    ).toBe("/dashboard");
  });

  it("leave other public pages alone, and anyone without a session", async () => {
    expect(
      target(
        await middleware(requestFor("/acompanhar/abc", sessionFor("MASTER"))),
      ),
    ).toBeNull();
    expect(target(await middleware(requestFor("/login")))).toBeNull();
  });
});

describe("private areas", () => {
  it("need a session", async () => {
    for (const path of [
      "/dashboard",
      "/admin/business",
      "/profile",
      "/profile/security",
      "/notifications",
      "/notifications/abc",
      "/driver/kanban",
    ]) {
      expect(target(await middleware(requestFor(path)))).toBe("/login");
    }
  });

  it("keep the MASTER in /admin and everybody else out of it", async () => {
    expect(
      target(
        await middleware(requestFor("/dashboard/fuel", sessionFor("MASTER"))),
      ),
    ).toBe("/admin");
    expect(
      target(
        await middleware(
          requestFor("/admin/business", sessionFor("BUSINESS_ADMIN")),
        ),
      ),
    ).toBe("/dashboard");
    expect(
      target(
        await middleware(requestFor("/admin/business", sessionFor("MASTER"))),
      ),
    ).toBeNull();
  });

  it("let a business admin who is also a driver use the company area", async () => {
    expect(
      target(
        await middleware(
          requestFor(
            "/dashboard/fuel",
            sessionFor("BUSINESS_ADMIN", "driver-1"),
          ),
        ),
      ),
    ).toBeNull();
  });
});

describe("an expired token", () => {
  it("is renewed with a POST of the refresh token, and the page reloaded with both cookies", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "new-access",
          refresh_token: jwt({ exp: inAnHour() }),
        }),
        { status: 200 },
      ),
    );

    const response = await middleware(
      requestFor(
        "/dashboard/fuel",
        sessionFor("BUSINESS_USER", null, 1),
        "old-refresh",
      ),
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/user/refresh-token");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({ token: "old-refresh" });
    expect(target(response)).toBe("/dashboard/fuel");
    expect(response.headers.getSetCookie().join("; ")).toContain(
      "tkey=new-access",
    );
  });

  it("is not renewed when it cannot be read at all", async () => {
    const response = await middleware(
      requestFor("/sobre", "not-a-jwt", "old-refresh"),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(target(response)).toBeNull();
  });

  it("is not renewed while it is still valid", async () => {
    await middleware(
      requestFor(
        "/dashboard/fuel",
        sessionFor("BUSINESS_USER", null, inAnHour()),
      ),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the session when the API cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await middleware(
      requestFor("/dashboard/fuel", sessionFor("BUSINESS_USER", null, 1)),
    );

    expect(target(response)).toBeNull();
  });
});

describe("the matcher", () => {
  it("runs on pages, the root and the API routes, not on files or Next's own", () => {
    expect(config.matcher).toEqual([
      String.raw`/((?!.+\.[\w]+$|_next).*)`,
      "/",
      "/(api|trpc)(.*)",
    ]);
  });
});

describe("the content security policy", () => {
  it("names the public API host, trimmed, and allows no eval outside development", async () => {
    process.env.PUBLIC_API_URL = "  https://api.trajetto.test  ";

    const policy =
      (
        await middleware(requestFor("/dashboard", sessionFor("BUSINESS_USER")))
      ).headers.get("content-security-policy") ?? "";

    expect(policy).toContain("https://api.trajetto.test");
    expect(policy).toContain("wss://api.trajetto.test");
    expect(policy).not.toContain("  https://api.trajetto.test");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows eval only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    try {
      const policy =
        (
          await middleware(
            requestFor("/dashboard", sessionFor("BUSINESS_USER")),
          )
        ).headers.get("content-security-policy") ?? "";

      expect(policy).toContain("'unsafe-eval'");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("hands no nonce to a page served from cache", async () => {
    const response = await middleware(requestFor("/sobre"));

    expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
  });
});

describe("the CSP nonce", () => {
  it("goes only to pages rendered per request", async () => {
    const policy = async (path: string, token?: string) =>
      (await middleware(requestFor(path, token))).headers.get(
        "content-security-policy",
      ) ?? "";

    expect(await policy("/dashboard", sessionFor("BUSINESS_USER"))).toMatch(
      /'nonce-/,
    );
    expect(await policy("/acompanhar/abc")).toMatch(/'nonce-/);
    expect(await policy("/verificar/abc")).toMatch(/'nonce-/);
    expect(await policy("/sobre")).not.toMatch(/'nonce-/);
    expect(await policy("/x/acompanhar/abc")).not.toMatch(/'nonce-/);
  });

  it("goes to the sign-in pages and the developer portal, never to a look-alike path", async () => {
    const policy = async (path: string) =>
      (await middleware(requestFor(path))).headers.get(
        "content-security-policy",
      ) ?? "";

    expect(await policy("/login")).toMatch(/'nonce-/);
    expect(await policy("/forgot/password")).toMatch(/'nonce-/);
    expect(await policy("/new-verification")).toMatch(/'nonce-/);
    expect(await policy("/docs")).toMatch(/'nonce-/);
    expect(await policy("/docs/autenticacao")).toMatch(/'nonce-/);
    expect(await policy("/verificar")).toMatch(/'nonce-/);
    expect(await policy("/docsx")).not.toMatch(/'nonce-/);
    expect(await policy("/login/x")).not.toMatch(/'nonce-/);
    expect(await policy("/blog")).not.toMatch(/'nonce-/);
  });
});
