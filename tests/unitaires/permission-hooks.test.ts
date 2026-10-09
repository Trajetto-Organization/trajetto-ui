import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two permission hooks the buttons read (`useHasPermission`,
 * `useCheckMultiplePermissions`), rendered for real against the real auth
 * store. Only `loadAuth` is a spy (the real one reads a server-action
 * cookie). Re-renders come from the store changing, as in the panel, so a
 * stale effect or memo shows up as a wrong answer after the change.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("@/actions/cookies", () => ({ getCookies: async () => null }));

import { useCheckMultiplePermissions } from "@/lib/check-multiple-permissions";
import { useHasPermission } from "@/lib/user-has-permission";
import { useAuthStore } from "@/store/auth-store";

(globalThis as { React?: typeof React }).React = React;

type Role = "MASTER" | "BUSINESS_ADMIN" | "BUSINESS_USER" | null;

const loadAuth = vi.fn(async () => {});

let root: Root | null = null;
let host: HTMLElement | null = null;

/** Renders a hook and keeps its latest value; `rerender` swaps the props. */
function renderHook<P, R>(hook: (props: P) => R, initial: P) {
  const result: { current: R | undefined } = { current: undefined };

  function Probe({ props }: { props: P }): null {
    result.current = hook(props);
    return null;
  }

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(createElement(Probe, { props: initial })));

  return {
    result,
    rerender: (props: P) =>
      act(() => root!.render(createElement(Probe, { props }))),
  };
}

function setSession(state: {
  role?: Role;
  permissions?: unknown;
  isLoaded?: boolean;
}) {
  act(() => {
    useAuthStore.setState(state as never);
  });
}

beforeEach(() => {
  loadAuth.mockClear();
  useAuthStore.setState({
    role: "BUSINESS_USER",
    permissions: [],
    isLoaded: true,
    loadAuth,
  } as never);
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const rows = [
  { permissionKey: "fuel_manage", canRead: true, canWrite: false },
  { permissionKey: "fine_manage", canRead: false, canWrite: true },
];

const required = [
  {
    key: "fuel_manage" as const,
    action: "read" as const,
    label: "Abastecimentos",
  },
  { key: "fine_manage" as const, action: "read" as const, label: "Multas" },
  {
    key: "driver_manage" as const,
    action: "write" as const,
    label: "Motoristas",
  },
];

describe("loading the session", () => {
  it("loads it on mount when not loaded yet, or loaded without a role", () => {
    setSession({ isLoaded: false });
    renderHook(() => useHasPermission("fuel_manage"), null);
    act(() => root!.unmount());

    setSession({ isLoaded: true, role: null });
    renderHook(() => useCheckMultiplePermissions([]), null);

    expect(loadAuth).toHaveBeenCalledTimes(2);
  });

  it("does not reload a loaded session", () => {
    renderHook(() => useHasPermission("fuel_manage"), null);
    act(() => root!.unmount());
    renderHook(() => useCheckMultiplePermissions([]), null);

    expect(loadAuth).not.toHaveBeenCalled();
  });

  it("reloads when the session is dropped after mount (logout, expiry)", () => {
    renderHook(() => useHasPermission("fuel_manage"), null);
    expect(loadAuth).not.toHaveBeenCalled();

    setSession({ role: null });
    expect(loadAuth).toHaveBeenCalledTimes(1);
  });

  it("reloads in the multiple-permissions hook too when the session drops", () => {
    renderHook(() => useCheckMultiplePermissions(required), null);

    setSession({ isLoaded: false });
    expect(loadAuth).toHaveBeenCalledTimes(1);
  });
});

describe("useHasPermission", () => {
  it("grants everything to MASTER and BUSINESS_ADMIN", () => {
    setSession({ role: "MASTER", permissions: null });
    const { result } = renderHook(
      () => useHasPermission("fuel_manage", "write"),
      null,
    );
    expect(result.current).toBe(true);

    setSession({ role: "BUSINESS_ADMIN" });
    expect(result.current).toBe(true);
  });

  it("refuses a user without a permission list or without the row", () => {
    setSession({ permissions: null });
    const { result, rerender } = renderHook(
      (key: "fuel_manage" | "driver_manage") => useHasPermission(key),
      "fuel_manage" as "fuel_manage" | "driver_manage",
    );
    expect(result.current).toBe(false);

    setSession({ permissions: { fuel_manage: true } });
    expect(result.current).toBe(false);

    setSession({ permissions: rows });
    rerender("driver_manage");
    expect(result.current).toBe(false);
  });

  it("reads the row's read flag by default and its write flag on request", () => {
    setSession({ permissions: rows });
    const { result, rerender } = renderHook(
      ([key, access]: [
        "fuel_manage" | "fine_manage",
        "read" | "write" | undefined,
      ]) => useHasPermission(key, access),
      ["fuel_manage", undefined],
    );

    expect(result.current).toBe(true);
    rerender(["fuel_manage", "write"]);
    expect(result.current).toBe(false);
    rerender(["fine_manage", undefined]);
    expect(result.current).toBe(false);
    rerender(["fine_manage", "write"]);
    expect(result.current).toBe(true);
  });

  it("follows the store when the profile changes while mounted", () => {
    const { result } = renderHook(() => useHasPermission("fuel_manage"), null);
    expect(result.current).toBe(false);

    setSession({ permissions: rows });
    expect(result.current).toBe(true);
  });
});

describe("useCheckMultiplePermissions", () => {
  it("lists what is missing, in order, with the tooltip", () => {
    setSession({ permissions: rows });
    const { result } = renderHook(
      () => useCheckMultiplePermissions(required),
      null,
    );

    expect(result.current).toEqual({
      hasAllPermissions: false,
      missingPermissions: ["Multas", "Motoristas"],
      tooltipMessage:
        "Você não possui as seguintes permissões necessárias: Multas, Motoristas",
    });
  });

  it("has nothing to say when everything is granted", () => {
    setSession({ permissions: rows });
    const { result } = renderHook(
      () => useCheckMultiplePermissions([required[0]]),
      null,
    );

    expect(result.current).toEqual({
      hasAllPermissions: true,
      missingPermissions: [],
      tooltipMessage: "",
    });
  });

  it("checks the write flag for a write requirement, not the read flag", () => {
    setSession({ permissions: rows });
    const writeFine = [
      {
        key: "fine_manage" as const,
        action: "write" as const,
        label: "Multas",
      },
    ];
    const writeFuel = [
      {
        key: "fuel_manage" as "fuel_manage" | "fine_manage",
        action: "write" as const,
        label: "Abastecimentos",
      },
    ];
    const { result, rerender } = renderHook(
      (list: typeof writeFuel) => useCheckMultiplePermissions(list),
      writeFine as typeof writeFuel,
    );
    expect(result.current?.hasAllPermissions).toBe(true);

    rerender(writeFuel);
    expect(result.current?.missingPermissions).toEqual(["Abastecimentos"]);
  });

  it("grants admins everything and refuses a malformed list", () => {
    setSession({ role: "BUSINESS_ADMIN", permissions: null });
    const { result } = renderHook(
      () => useCheckMultiplePermissions(required),
      null,
    );
    expect(result.current?.hasAllPermissions).toBe(true);

    setSession({ role: "BUSINESS_USER", permissions: { fuel_manage: true } });
    expect(result.current?.hasAllPermissions).toBe(false);
  });

  it("recomputes when the role, the permissions or the requirements change", () => {
    const { result, rerender } = renderHook(
      (list: typeof required) => useCheckMultiplePermissions(list),
      [required[0]],
    );
    expect(result.current?.hasAllPermissions).toBe(false);

    setSession({ permissions: rows });
    expect(result.current?.hasAllPermissions).toBe(true);

    rerender(required);
    expect(result.current?.missingPermissions).toEqual([
      "Multas",
      "Motoristas",
    ]);

    setSession({ role: "MASTER" });
    expect(result.current?.hasAllPermissions).toBe(true);
  });
});
