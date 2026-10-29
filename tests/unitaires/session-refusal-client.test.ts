import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The client twin of the server gate: a socket event makes the page re-read
 * /user/me, and a 403 there decides how the session ends.
 *
 * It matched the message too, so a deactivated company or a removed profile
 * ended as the generic "Acesso não autorizado" ("sua conta foi excluída"),
 * and a reworded message would have lost "revoked" and "driver inactive" as
 * well. It reads the code now.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const forceLogout = vi.hoisted(() => vi.fn());
const setUnreachable = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/cookies", () => ({
  getCookies: async () => "token-value",
}));

vi.mock("@/lib/force-logout", () => ({ forceLogout }));

vi.mock("@/lib/connection-status", () => ({
  useConnectionStore: (select: (state: unknown) => unknown) =>
    select({ setUnreachable }),
}));

import { useNavigationSecurityCheck } from "@/app/(protected)/_components/layout/hooks/navigation-security-check";
import { seedPublicConfig } from "./helpers/public-config";

(globalThis as { React?: typeof React }).React = React;

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

async function meAnswers(status: number, body: unknown): Promise<void> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );

  await mount();

  await act(async () => {
    window.dispatchEvent(new CustomEvent("security-check-required"));
  });

  await vi.waitFor(() => {
    expect(
      forceLogout.mock.calls.length + setUnreachable.mock.calls.length,
    ).toBeGreaterThan(0);
  });
}

beforeEach(() => {
  forceLogout.mockReset();
  // The API URL the page carries (src/env), read at run time.
  seedPublicConfig();
  setUnreachable.mockReset();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  vi.unstubAllGlobals();
});

describe("a 403 from /user/me after a socket event", () => {
  it.each([
    ["AUTH_BUSINESS_INACTIVE", "business_inactive"],
    ["TENANT_INACTIVE", "business_inactive"],
    ["AUTH_PROFILE_NOT_CONFIGURED", "no_user_permission"],
    ["AUTH_ACCESS_REVOKED", "user_revoked"],
    ["AUTH_DRIVER_INACTIVE", "driver_inactive"],
    ["AUTH_BRANCH_INACTIVE", "branch_inactive"],
  ])("ends %s as %s, whatever the message says", async (code, reason) => {
    await meAnswers(403, { code, message: "Texto reescrito pela API." });

    expect(forceLogout).toHaveBeenCalledWith(reason);
    expect(setUnreachable).not.toHaveBeenCalled();
  });

  it("still keeps the session when the API is failing", async () => {
    await meAnswers(503, { code: "SERVICE_UNAVAILABLE" });

    expect(forceLogout).not.toHaveBeenCalled();
    expect(setUnreachable).toHaveBeenCalledWith(true);
  });
});
