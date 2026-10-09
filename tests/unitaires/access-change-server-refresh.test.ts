import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SSR-STALE-1, through the real hook.
 *
 * `permissions_changed` and `entitlementsChanged` reach the page as a
 * "security-check-required" event; the hook re-reads /user/me and updates the
 * store, which redraws the menus. What the server rendered — the tabs of
 * Entregas, a "sem permissão" state — stayed stale until the next
 * navigation. It now asks the router to render the page again, once per
 * burst, and only when the access really changed.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const location = vi.hoisted(() => ({ pathname: "/dashboard/deliveries" }));

vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
  useRouter: () => router,
}));

vi.mock("@/actions/cookies", () => ({
  getCookies: async () => jwt({ role: "BUSINESS_USER", driverId: null }),
}));

vi.mock("@/lib/force-logout", () => ({ forceLogout: vi.fn() }));

import { useNavigationSecurityCheck } from "@/app/(protected)/_components/layout/hooks/navigation-security-check";
import { useAuthStore } from "@/store/auth-store";
import { seedPublicConfig } from "./helpers/public-config";

(globalThis as { React?: typeof React }).React = React;

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "none" })}.${encode(payload)}.x`;
}

const WRITE = {
  permissionKey: "delivery_manage",
  canRead: true,
  canWrite: true,
};
const READ_ONLY = { ...WRITE, canWrite: false };

function meAnswering(permissions: unknown[], enabledModules = ["DELIVERIES"]) {
  return async () =>
    new Response(
      JSON.stringify({
        user: {
          id: "user-1",
          businessId: "company-1",
          role: "BUSINESS_USER",
          driverId: null,
          profileAccess: { permissions },
          enabledModules,
        },
      }),
      { status: 200 },
    );
}

let root: Root | null = null;
let host: HTMLElement | null = null;

function Probe(): null {
  useNavigationSecurityCheck();
  return null;
}

async function mount(): Promise<void> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(createElement(Probe));
  });
}

async function securityEvent(times = 1): Promise<void> {
  await act(async () => {
    for (let index = 0; index < times; index += 1) {
      window.dispatchEvent(new CustomEvent("security-check-required"));
    }
  });

  // Let the /user/me round trips settle, then the debounce.
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // The API URL the page carries (src/env), read at run time.
  seedPublicConfig();
  router.refresh.mockReset();
  location.pathname = "/dashboard/deliveries";

  useAuthStore.setState({
    id: "user-1",
    businessId: "company-1",
    role: "BUSINESS_USER",
    permissions: [WRITE] as never,
    enabledModules: ["DELIVERIES"],
    isLoaded: true,
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the page rendered by the server follows an access change", () => {
  it("renders again when the profile lost write", async () => {
    vi.stubGlobal("fetch", vi.fn(meAnswering([READ_ONLY])));
    await mount();

    await securityEvent();

    expect(useAuthStore.getState().permissions[0]?.canWrite).toBe(false);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("renders again once for a burst of events", async () => {
    vi.stubGlobal("fetch", vi.fn(meAnswering([READ_ONLY])));
    await mount();

    await securityEvent(3);

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("renders again when a module is switched off", async () => {
    // Standing on a page the module does not own (a page it owns is left by
    // a full navigation instead, which renders everything anyway).
    location.pathname = "/dashboard/kanban";
    vi.stubGlobal("fetch", vi.fn(meAnswering([WRITE], ["FLEET"])));
    await mount();

    await securityEvent();

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("does not render again when nothing changed", async () => {
    vi.stubGlobal("fetch", vi.fn(meAnswering([WRITE])));
    await mount();

    await securityEvent();

    expect(router.refresh).not.toHaveBeenCalled();
  });
});
