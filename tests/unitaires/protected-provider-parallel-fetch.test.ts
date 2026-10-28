// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { React } from "./helpers/render-html";

void React;

// An unsigned token with the claims the layout reads (the API is the judge).
vi.mock("@/actions/cookies", () => ({
  getCookies: vi.fn(
    async () => `h.${btoa(JSON.stringify({ role: "BUSINESS_ADMIN" }))}.s`,
  ),
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-pathname": "/dashboard" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

// The client tree under the gate is not what is measured here.
vi.mock("@/app/(protected)/_components/layout", () => ({
  ProtectedLayout: () => null,
}));
vi.mock(
  "@/app/(protected)/_components/layout/protected-command-bar-provider",
  () => ({
    ProtectedCommandBar: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/layout/protected-provider/sync-notifications-wrapper",
  () => ({ SyncNotificationsProvider: () => null }),
);
vi.mock("@/components/shared/connection-lost-screen/connection-retry", () => ({
  ConnectionRetry: () => null,
}));

import { ProtectedProvider } from "@/app/(protected)/_components/layout/protected-provider";

/**
 * The protected layout runs on every full load and every refresh of the
 * dashboard. It asked the API for the session (`/user/me`) and only then for
 * the notifications, although the second needs nothing from the first: two
 * API round trips in series before the first byte of any protected page.
 */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const USER = {
  user: {
    id: "u1",
    businessId: "b1",
    email: "a@b.c",
    name: "Ana",
    avatar: null,
    role: "BUSINESS_ADMIN",
    two_factor_enabled: false,
    driverId: null,
    profileAccess: null,
    enabledModules: ["FLEET"],
  },
};

beforeEach(() => {
  vi.stubEnv("HTTP_REQUEST", "http://api.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ProtectedProvider", () => {
  it("asks for the notifications while /user/me is still in flight", async () => {
    let answerMe: (response: Response) => void = () => undefined;
    const requested: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        requested.push(new URL(url).pathname);

        if (url.includes("/user/me")) {
          return new Promise<Response>((resolve) => {
            answerMe = resolve;
          });
        }

        return Promise.resolve(new Response('{"meta":{}}\n', { status: 200 }));
      }),
    );

    const rendering = ProtectedProvider({ children: null });

    await tick();

    // Both already asked, the session not yet answered.
    expect([...requested].sort()).toEqual(["/notification/stream", "/user/me"]);

    answerMe(new Response(JSON.stringify(USER), { status: 200 }));

    await expect(rendering).resolves.toBeTruthy();
    expect(requested).toHaveLength(2);
  });

  // The second defect: even overlapped, the layout awaited the 50
  // notifications before rendering anything under it, so every protected
  // page waited for the slower of the two. The list now streams in its own
  // Suspense boundary behind the page.
  it("renders the page without waiting for the notifications", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.includes("/user/me")
          ? Promise.resolve(new Response(JSON.stringify(USER), { status: 200 }))
          : // The list never answers.
            new Promise<Response>(() => undefined),
      ),
    );

    await expect(ProtectedProvider({ children: null })).resolves.toBeTruthy();
  });

  it("bounds the session read, and a timeout keeps the session", async () => {
    const signals: Array<AbortSignal | null | undefined> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        signals.push(init?.signal);

        return url.includes("/user/me")
          ? Promise.reject(
              new DOMException("The operation timed out.", "TimeoutError"),
            )
          : Promise.resolve(new Response('{"meta":{}}\n', { status: 200 }));
      }),
    );

    // The connection screen (mocked to null here), never a redirect.
    await expect(ProtectedProvider({ children: null })).resolves.toBeDefined();
    expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(true);
  });

  it("still logs out on the API's verdict, whatever the notifications answered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/user/me")
          ? new Response(JSON.stringify({ code: "SESSION_REVOKED" }), {
              status: 401,
            })
          : new Response("", { status: 500 }),
      ),
    );

    await expect(ProtectedProvider({ children: null })).rejects.toThrow(
      /redirect:\/login/,
    );
  });
});
