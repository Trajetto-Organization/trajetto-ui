// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

const jar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: () => jar,
  headers: () => new Headers(),
}));

import middleware from "@/middleware";
import {
  handleAuthenticateUser,
  handleLogOutUser,
} from "@/actions/user/user-authentication";
import { sessionCookieOptions } from "@/lib/session-cookie-options";

/**
 * How long the browser keeps the session cookies.
 *
 * Login computed `maxAge` from an expiration nobody passed: `undefined - now`,
 * so the header said `Max-Age=NaN`, which browsers discard — the cookies
 * became session cookies and closing the browser logged the person out. The
 * refresh in the middleware set them with no lifetime at all. Two paths, two
 * behaviours, and the one the code meant never happened.
 *
 * Both cookies now live as long as the REFRESH token. Not the access token's
 * fifteen minutes: the middleware needs the expired access token in hand to
 * know it should refresh, and a browser that had already dropped it would send
 * the person to /login instead.
 */
const DAY = 86_400;

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  jar.set.mockReset();
  jar.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sessionCookieOptions", () => {
  it("lasts as long as the refresh token", () => {
    const now = Date.now();
    const refresh = jwt({ exp: Math.floor(now / 1000) + DAY });

    const options = sessionCookieOptions(refresh, now);

    expect(options.maxAge).toBeGreaterThanOrEqual(DAY - 1);
    expect(options.maxAge).toBeLessThanOrEqual(DAY);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it.each([
    ["garbage", "garbage"],
    ["a token without exp", jwt({ sub: "user" })],
    ["an exp that is not a number", jwt({ exp: "tomorrow" })],
    ["a token already expired", jwt({ exp: nowSeconds() - 10 })],
  ])("leaves the lifetime out for %s, never NaN", (_label, refresh) => {
    const options = sessionCookieOptions(refresh);

    expect("maxAge" in options).toBe(false);
    expect(JSON.stringify(options)).not.toContain("NaN");
  });
});

describe("the login", () => {
  it("sets both cookies with the refresh token's lifetime", async () => {
    const refresh = jwt({ exp: nowSeconds() + DAY });

    await handleAuthenticateUser({
      token: jwt({ exp: nowSeconds() + 900 }),
      refresh_token: refresh,
    });

    const names = jar.set.mock.calls.map(([name]) => name).sort();
    expect(names).toEqual(["rkey", "tkey"]);

    for (const [, , options] of jar.set.mock.calls) {
      expect(Number.isNaN(options.maxAge)).toBe(false);
      expect(options.maxAge).toBeGreaterThanOrEqual(DAY - 1);
      expect(options.httpOnly).toBe(true);
    }
  });

  it("clears both cookies on logout", async () => {
    await handleLogOutUser();

    const names = jar.delete.mock.calls.map(([name]) => name).sort();
    expect(names).toEqual(["rkey", "tkey"]);
  });
});

describe("the refresh in the middleware", () => {
  it("sets both cookies with the new refresh token's lifetime", async () => {
    process.env.HTTP_REQUEST = "http://api.test";

    const refreshed = jwt({ exp: nowSeconds() + DAY });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              token: jwt({ role: "BUSINESS_ADMIN", exp: nowSeconds() + 900 }),
              refresh_token: refreshed,
            }),
            { status: 200 },
          ),
      ),
    );

    const expired = jwt({ role: "BUSINESS_ADMIN", exp: nowSeconds() - 60 });

    const response = await middleware(
      new NextRequest("http://app.test/dashboard", {
        headers: { cookie: `tkey=${expired}; rkey=old-refresh` },
      }),
    );

    const cookies = response.headers.getSetCookie();

    for (const name of ["tkey", "rkey"]) {
      const header = cookies.find((cookie) => cookie.startsWith(`${name}=`));
      const maxAge = Number(header?.match(/Max-Age=(\d+)/i)?.[1]);

      expect(maxAge, header).toBeGreaterThanOrEqual(DAY - 2);
      expect(maxAge, header).toBeLessThanOrEqual(DAY);
    }
  });
});

describe("who can write the session cookies", () => {
  it("is not the browser", () => {
    // Exported from a "use server" module, a setter is a Server Action: any
    // script on the origin could plant a session of its choosing.
    const cookiesAction = readFileSync(
      resolve(process.cwd(), "src/actions/cookies/index.ts"),
      "utf8",
    );
    const authentication = readFileSync(
      resolve(process.cwd(), "src/actions/user/user-authentication/index.ts"),
      "utf8",
    );

    expect(cookiesAction).not.toMatch(
      /export\s*\{[^}]*\b(setCookies|deleteCookies)\b/,
    );
    expect(authentication).not.toMatch(/^\s*["']use server["']/m);
  });
});
