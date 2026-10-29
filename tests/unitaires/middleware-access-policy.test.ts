// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import middleware from "@/middleware";
import { canAccessPath } from "@/lib/route-access";

/**
 * The edge's own rules, read from the same registry as the menus.
 *
 * - Pages restricted by role (/dashboard/activity) used to be a hand-written
 *   line here while the palette offered the page to everybody (ACT-ROUTE-1).
 * - A staging or local server must never be indexed. next.config headers are
 *   fixed at build and the one image is promoted from staging to production
 *   (decision 12.2), so the header is decided per request, here.
 */
function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

function sessionFor(role: string, driverId: string | null = null): string {
  return jwt({
    role,
    driverId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

function requestFor(path: string, token?: string): NextRequest {
  return new NextRequest(`http://app.test${path}`, {
    headers: token ? { cookie: `tkey=${token}; rkey=refresh` } : {},
  });
}

const env = { ...process.env };

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

describe("pages restricted by role", () => {
  it("sends an employee away from the company activity feed", async () => {
    const response = await middleware(
      requestFor("/dashboard/activity", sessionFor("BUSINESS_USER")),
    );

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/dashboard",
    );
  });

  it("lets the admin in", async () => {
    const response = await middleware(
      requestFor("/dashboard/activity", sessionFor("BUSINESS_ADMIN")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps a driver on the driver's surface, on a segment boundary", async () => {
    const response = await middleware(
      requestFor("/driverx/anything", sessionFor("BUSINESS_USER", "driver-1")),
    );

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/profile",
    );

    const inside = await middleware(
      requestFor("/driver/vehicles", sessionFor("BUSINESS_USER", "driver-1")),
    );

    expect(inside.headers.get("location")).toBeNull();
  });

  it("keeps everybody else off /driver, agreeing with canAccessPath", async () => {
    // One rule for the edge and the menus: canAccessPath answered true for
    // an employee on /driver/vehicles while this line bounced them.
    const sessions = [
      { role: "BUSINESS_USER" as const, home: "/dashboard" },
      { role: "BUSINESS_ADMIN" as const, home: "/dashboard" },
      { role: "MASTER" as const, home: "/admin" },
    ];

    for (const { role, home } of sessions) {
      for (const path of ["/driver", "/driver/vehicles", "/driver/kanban"]) {
        const response = await middleware(requestFor(path, sessionFor(role)));

        expect(
          new URL(response.headers.get("location") ?? "http://x/").pathname,
          `${role} ${path}`,
        ).toBe(home);
        expect(
          canAccessPath(path, { role, enabledModules: null }),
          `${role} ${path}`,
        ).toBe(false);
      }
    }
  });
});

describe("indexing", () => {
  it("says noindex on a staging server, on every response", async () => {
    process.env.APP_ENV = "staging";

    const page = await middleware(requestFor("/sobre"));
    const redirect = await middleware(requestFor("/dashboard"));

    expect(page.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(redirect.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("says nothing in production", async () => {
    process.env.APP_ENV = "production";

    const page = await middleware(requestFor("/sobre"));

    expect(page.headers.get("x-robots-tag")).toBeNull();
  });
});
