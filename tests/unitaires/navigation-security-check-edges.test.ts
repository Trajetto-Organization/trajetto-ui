import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The navigation security check's verdicts, through the real hook (harness of
 * access-change-server-refresh.test.ts). Left alive by the 06/10 mutation
 * run: the request itself, the sign-in redirect without a token, the role
 * and driver changes that end the session, an employee without a profile,
 * and the page gate's redirect.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const nav = vi.hoisted(() => ({
  pathname: "/dashboard/deliveries" as string | null,
}));
const cookie = vi.hoisted(() => ({ token: null as string | null }));
const forceLogout = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => router,
}));

vi.mock("@/actions/cookies", () => ({
  getCookies: async (name: string) => (name === "tkey" ? cookie.token : null),
}));

vi.mock("@/lib/force-logout", () => ({ forceLogout }));

import { useNavigationSecurityCheck } from "@/app/(protected)/_components/layout/hooks/navigation-security-check";
import { useConnectionStore } from "@/lib/connection-status";
import { useAuthStore } from "@/store/auth-store";
import { seedPublicConfig } from "./helpers/public-config";

(globalThis as { React?: typeof React }).React = React;

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "none" })}.${encode(payload)}.x`;
}

const DELIVERY = {
  permissionKey: "delivery_manage",
  canRead: true,
  canWrite: true,
};

const fetchMe = vi.fn();

function answer(user: Record<string, unknown> | null) {
  fetchMe.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          user: user && {
            id: "user-1",
            businessId: "company-1",
            role: "BUSINESS_USER",
            driverId: null,
            profileAccess: { permissions: [DELIVERY] },
            enabledModules: ["DELIVERIES"],
            ...user,
          },
        }),
        { status: 200 },
      ),
  );
}

const assigned: string[] = [];
let root: Root | null = null;
let host: HTMLElement | null = null;

function Probe(): null {
  useNavigationSecurityCheck();
  return null;
}

async function unmount(): Promise<void> {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
}

async function check(): Promise<void> {
  await unmount();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root?.render(createElement(Probe)));
  await act(async () => {
    window.dispatchEvent(new CustomEvent("security-check-required"));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

beforeEach(() => {
  seedPublicConfig();
  forceLogout.mockReset();
  router.refresh.mockReset();
  fetchMe.mockReset();
  assigned.length = 0;
  nav.pathname = "/dashboard/deliveries";
  cookie.token = jwt({ role: "BUSINESS_USER", driverId: null });
  vi.stubGlobal("fetch", fetchMe);

  // jsdom cannot navigate; the hook's redirects are read off this stand-in.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return assigned.at(-1) ?? "http://localhost/";
      },
      set href(value: string) {
        assigned.push(value);
      },
    },
  });

  useConnectionStore.getState().setUnreachable(true);
  useAuthStore.setState({
    id: "user-1",
    businessId: "company-1",
    role: "BUSINESS_USER",
    permissions: [DELIVERY] as never,
    enabledModules: ["DELIVERIES"],
    isLoaded: true,
  });
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
});

describe("the request", () => {
  it("asks /user/me through the same-origin relay, with no token in the page", async () => {
    answer({});

    await check();

    expect(fetchMe).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMe.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe("/api/relay/user/me");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.stringify(init)).not.toContain(cookie.token as string);
    expect(useConnectionStore.getState().isUnreachable).toBe(false);
    expect(forceLogout).not.toHaveBeenCalled();
    expect(assigned).toEqual([]);
  });

  it("sends a session without a token to the sign-in page, without asking", async () => {
    cookie.token = null;

    await check();

    expect(assigned).toEqual(["/login"]);
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("does nothing more when the answer has no user", async () => {
    answer(null);

    await check();

    expect(forceLogout).not.toHaveBeenCalled();
    expect(assigned).toEqual([]);
    expect(useConnectionStore.getState().isUnreachable).toBe(false);
  });

  it("does nothing more when the answer is not an object", async () => {
    fetchMe.mockImplementation(
      async () => new Response("null", { status: 200 }),
    );

    await check();

    expect(forceLogout).not.toHaveBeenCalled();
    expect(useConnectionStore.getState().isUnreachable).toBe(false);
  });

  it("stops listening once the page is gone", async () => {
    answer({});
    await check();
    await unmount();

    window.dispatchEvent(new CustomEvent("security-check-required"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchMe).toHaveBeenCalledTimes(1);
  });
});

describe("what ends the session", () => {
  it("a token that cannot be read", async () => {
    cookie.token = "not-a-jwt";
    answer({});

    await check();

    expect(forceLogout).toHaveBeenCalledWith("permissions_changed");
  });

  it("a role changed since the token", async () => {
    answer({ role: "BUSINESS_ADMIN" });

    await check();

    expect(forceLogout).toHaveBeenCalledWith("permissions_changed");
  });

  it("an employee who became a driver, and a driver who stopped being one", async () => {
    answer({ driverId: "driver-1" });
    await check();
    expect(forceLogout).toHaveBeenLastCalledWith("permissions_changed");

    forceLogout.mockReset();
    cookie.token = jwt({ role: "BUSINESS_USER", driverId: "driver-1" });
    answer({ driverId: null });
    await check();
    expect(forceLogout).toHaveBeenLastCalledWith("permissions_changed");
  });

  it("not a driver who still is one", async () => {
    nav.pathname = "/driver/kanban";
    cookie.token = jwt({ role: "BUSINESS_USER", driverId: "driver-1" });
    answer({ driverId: "driver-1", profileAccess: null });

    await check();

    expect(forceLogout).not.toHaveBeenCalled();
    expect(assigned).toEqual([]);
    expect(useConnectionStore.getState().isUnreachable).toBe(false);
    expect(useAuthStore.getState().permissions).toEqual([]);
  });

  it("an employee left without a profile, or with an empty one", async () => {
    answer({ profileAccess: null });
    await check();
    expect(forceLogout).toHaveBeenLastCalledWith("no_user_permission");

    forceLogout.mockReset();
    answer({ profileAccess: { permissions: [] } });
    await check();
    expect(forceLogout).toHaveBeenLastCalledWith("no_user_permission");
  });

  it("not an admin without a profile", async () => {
    cookie.token = jwt({ role: "BUSINESS_ADMIN", driverId: null });
    answer({ role: "BUSINESS_ADMIN", profileAccess: null });

    await check();

    expect(forceLogout).not.toHaveBeenCalled();
  });
});

describe("the page gate", () => {
  it("sends a user off a page they lost to their home", async () => {
    answer({
      profileAccess: {
        permissions: [
          { permissionKey: "fuel_manage", canRead: true, canWrite: true },
        ],
      },
    });

    await check();

    expect(assigned).toEqual(["/dashboard"]);
  });

  it("keeps a user on a page they still have, and syncs the store", async () => {
    answer({
      profileAccess: { permissions: [{ ...DELIVERY, canWrite: false }] },
      enabledModules: ["DELIVERIES", "FLEET"],
    });

    await check();

    expect(assigned).toEqual([]);
    expect(useAuthStore.getState().permissions).toEqual([
      { permissionKey: "delivery_manage", canRead: true, canWrite: false },
    ]);
    expect(useAuthStore.getState().enabledModules).toEqual([
      "DELIVERIES",
      "FLEET",
    ]);
  });

  it("does not judge a page while the path is unknown", async () => {
    nav.pathname = null;
    answer({
      profileAccess: {
        permissions: [
          { permissionKey: "fuel_manage", canRead: true, canWrite: true },
        ],
      },
    });

    await check();

    expect(assigned).toEqual([]);
    expect(useConnectionStore.getState().isUnreachable).toBe(false);
    expect(useAuthStore.getState().permissions).toEqual([
      { permissionKey: "fuel_manage", canRead: true, canWrite: true },
    ]);
  });
});

describe("no answer at all", () => {
  it("raises the connection screen instead of judging the session", async () => {
    useConnectionStore.getState().setUnreachable(false);
    fetchMe.mockRejectedValue(new TypeError("fetch failed"));

    await check();

    expect(useConnectionStore.getState().isUnreachable).toBe(true);
    expect(forceLogout).not.toHaveBeenCalled();
  });
});
