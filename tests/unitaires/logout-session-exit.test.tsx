import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * "Sair" printed "POST /login 200" and "⨯ Error: aborted" in the Next
 * terminal on every logout, and the tab could land on a bare /login instead
 * of /login?reason=logout ("você saiu").
 *
 * Cause, traced on the shared stack: the API's logout use case announces
 * `securityAction` "logout" to the session's socket room while the logout
 * action is still answering. The tab that pressed "Sair" took it as "re-check
 * the session": `readSessionClaims` (a server action) went out with the
 * cookies already deleted, the middleware answered 307 to /login, the browser
 * re-posted it there, and the logout's own full navigation cut it off.
 * Another tab of the same session raced the cookie deletion the same way.
 *
 * Replaced here: the socket (a fake that fires events), the logout server
 * action (it deletes cookies over HTTP) and the cookie reader the session
 * claims action uses, so a call to it is visible.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const fake = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;
  const handlers = new Map<string, Set<Listener>>();

  const socket = {
    connected: true,
    on(event: string, listener: Listener) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(listener);
      return socket;
    },
    once(event: string, listener: Listener) {
      return socket.on(event, listener);
    },
    off(event: string, listener?: Listener) {
      if (listener) handlers.get(event)?.delete(listener);
      return socket;
    },
    emit: () => socket,
    fire(event: string, ...args: unknown[]) {
      [...(handlers.get(event) ?? [])].forEach((listener) => listener(...args));
    },
  };

  return { socket, handlers };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => fake.socket,
  getSocket: () => fake.socket,
  disconnectSocket: () => undefined,
  onRealtimeResync: () => () => undefined,
}));

const getCookies = vi.hoisted(() =>
  vi.fn(async (_name: string) => null as string | null),
);
vi.mock("@/actions/cookies", () => ({ getCookies }));

vi.mock("@/lib/notification-stream", () => ({
  fetchNotificationStream: async () => ({
    data: [],
    meta: { total: 0, unread: 0, nextCursor: null, hasMore: false },
  }),
}));

const forceLogout = vi.hoisted(() => vi.fn());
vi.mock("@/lib/force-logout", () => ({ forceLogout }));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  }),
}));

const handleLogout = vi.hoisted(() =>
  vi.fn(
    async (): Promise<
      { loggedOut?: true; logoutError?: string } | undefined
    > => ({ loggedOut: true }),
  ),
);
vi.mock("@/actions/user/logout-user", () => ({
  handleLogout: () => handleLogout(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { useNavigationSecurityCheck } from "@/app/(protected)/_components/layout/hooks/navigation-security-check";
import { logOutUser } from "@/app/(protected)/_components/layout/protected-account-settings/hooks";
import {
  SESSION_LOGOUT_DESTINATION,
  isSessionLogoutEvent,
} from "@/app/(protected)/_components/layout/protected-provider/notifications-provider/socket-logout-reason";
import { cancelSessionExit, isSessionExiting } from "@/lib/clear-session-state";

let assigned: string[] = [];
let root: Root | null = null;

beforeAll(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("Notification", {
    permission: "denied",
    requestPermission: async () => "denied",
  });
});

beforeEach(() => {
  assigned = [];
  getCookies.mockClear();
  forceLogout.mockClear();
  handleLogout.mockReset();
  handleLogout.mockResolvedValue({ loggedOut: true });
  sessionStorage.clear();
  cancelSessionExit();

  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return assigned.at(-1) ?? "http://localhost/dashboard";
      },
      set href(value: string) {
        assigned.push(value);
      },
      assign: (url: string) => assigned.push(url),
    },
  });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  fake.handlers.clear();
  cancelSessionExit();
});

async function render(element: React.ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(element));
  // Let `await initializeSocket()` bind the provider's listeners.
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

function SecurityCheckProbe(): null {
  useNavigationSecurityCheck();
  return null;
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 20));
  });
}

describe("the tab that pressed Sair", () => {
  it("is marked as leaving while the logout action runs", async () => {
    let duringAction: boolean | null = null;

    handleLogout.mockImplementation(async () => {
      duringAction = isSessionExiting();
      return { loggedOut: true };
    });

    await logOutUser();

    expect(duringAction).toBe(true);
    expect(assigned).toEqual(["/login?reason=logout"]);
  });

  it("resumes its checks when the logout failed", async () => {
    handleLogout.mockResolvedValue({ logoutError: "falhou" });

    const state = await logOutUser();

    expect(state).toEqual({ logoutError: "falhou" });
    expect(isSessionExiting()).toBe(false);
    expect(assigned).toEqual([]);
  });

  it("resumes its checks when the logout action itself throws (offline, transport error)", async () => {
    handleLogout.mockRejectedValue(new TypeError("Failed to fetch"));

    const state = await logOutUser();

    // Still signed in: forced logouts and the re-check must keep working.
    expect(isSessionExiting()).toBe(false);
    expect(sessionStorage.getItem("pending_login_toast")).toBeNull();
    expect(state?.logoutError).toMatch(/sair/i);
    expect(assigned).toEqual([]);
  });

  it("does not re-check the session it is ending (no readSessionClaims, no bare /login)", async () => {
    await render(createElement(SecurityCheckProbe));

    // The API's "logout" socket event lands while the action is answering.
    handleLogout.mockImplementation(async () => {
      await act(async () => {
        window.dispatchEvent(new CustomEvent("security-check-required"));
      });
      await settle();
      return { loggedOut: true };
    });

    await logOutUser();
    await settle();

    expect(getCookies).not.toHaveBeenCalled();
    expect(assigned).toEqual(["/login?reason=logout"]);
  });

  it("still re-checks a session that is not ending", async () => {
    await render(createElement(SecurityCheckProbe));

    await act(async () => {
      window.dispatchEvent(new CustomEvent("security-check-required"));
    });
    await settle();

    expect(getCookies).toHaveBeenCalledWith("tkey");
    // No cookie: the check itself sends the tab to the login page.
    expect(assigned).toEqual(["/login"]);
  });

  it("ignores the socket's logout event in the notifications provider", async () => {
    const { NotificationsProvider } =
      await import("@/app/(protected)/_components/layout/protected-provider/notifications-provider");
    // The provider and the check that listens to it, as the layout mounts them.
    await render(
      createElement(
        NotificationsProvider,
        null,
        createElement(SecurityCheckProbe),
      ),
    );

    handleLogout.mockImplementation(async () => {
      fake.socket.fire("securityAction", { reason: "logout" });
      return { loggedOut: true };
    });

    await logOutUser();
    await settle();

    expect(assigned).toEqual(["/login?reason=logout"]);
    expect(forceLogout).not.toHaveBeenCalled();
    expect(getCookies).not.toHaveBeenCalled();
  });
});

describe("another tab of the same session", () => {
  it("leaves through the middleware's force_logout to the same 'você saiu'", async () => {
    const { NotificationsProvider } =
      await import("@/app/(protected)/_components/layout/protected-provider/notifications-provider");
    await render(createElement(NotificationsProvider, null, null));

    await act(async () => {
      fake.socket.fire("securityAction", { reason: "logout" });
    });
    await settle();

    // The event can arrive before the other tab's response deleted the
    // shared cookies: force_logout deletes them here, then lands on
    // /login?reason=logout (middleware handleLogout).
    expect(assigned).toEqual(["/login?force_logout=true&error=logout"]);
    expect(sessionStorage.getItem("pending_login_toast")).toBe("true");
    expect(forceLogout).not.toHaveBeenCalled();
    expect(getCookies).not.toHaveBeenCalled();
  });

  it("recognises only the logout reason as that event", () => {
    expect(isSessionLogoutEvent({ reason: "logout" })).toBe(true);
    expect(isSessionLogoutEvent({ reason: "permissions_changed" })).toBe(false);
    expect(isSessionLogoutEvent(null)).toBe(false);
    expect(isSessionLogoutEvent("logout")).toBe(false);
    expect(SESSION_LOGOUT_DESTINATION).toBe(
      "/login?force_logout=true&error=logout",
    );
  });
});
