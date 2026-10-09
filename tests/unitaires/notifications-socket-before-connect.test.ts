import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The bell when the socket it is handed has not connected yet.
 *
 * `initializeSocket()` resolves as soon as the socket exists, so a tab opened
 * while the API refuses handshakes (a deploy, a database blink) gets a socket
 * that is still retrying. The provider must bind everything on it anyway —
 * `securityAction` is the forced logout of a blocked user — and the one
 * failure message it used to show from its `.catch` now comes from the first
 * `connect_error`: once, and never after the socket has connected.
 *
 * The socket is a fake: what is asserted is the provider's wiring.
 */
const fake = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  const handlers = new Map<string, Set<Listener>>();

  const socket = {
    connected: false,
    on(event: string, listener: Listener) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(listener);
      return socket;
    },
    once(event: string, listener: Listener) {
      const wrapper: Listener & { fn?: Listener } = (...args) => {
        socket.off(event, wrapper);
        listener(...args);
      };
      wrapper.fn = listener;
      return socket.on(event, wrapper);
    },
    off(event: string, listener?: Listener) {
      const set = handlers.get(event);
      if (!set) return socket;
      if (!listener) {
        handlers.delete(event);
        return socket;
      }
      for (const entry of [...set]) {
        if (
          entry === listener ||
          (entry as { fn?: Listener }).fn === listener
        ) {
          set.delete(entry);
        }
      }
      return socket;
    },
    emit: () => socket,
    fire(event: string, ...args: unknown[]) {
      [...(handlers.get(event) ?? [])].forEach((listener) => listener(...args));
    },
    count(event: string) {
      return handlers.get(event)?.size ?? 0;
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

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/lib/notification-stream", () => ({
  fetchNotificationStream: async () => ({
    data: [],
    meta: { total: 0, unread: 0, nextCursor: null, hasMore: false },
  }),
}));

const forceLogout = vi.hoisted(() => vi.fn());
vi.mock("@/lib/force-logout", () => ({ forceLogout }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  }),
);
vi.mock("sonner", () => ({ toast }));

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  vi.stubGlobal("Notification", {
    permission: "denied",
    requestPermission: async () => "denied",
  });
});

let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;

  fake.handlers.clear();
  fake.socket.connected = false;
  vi.clearAllMocks();
});

async function mountProvider(): Promise<void> {
  const { NotificationsProvider } =
    await import("@/app/(protected)/_components/layout/protected-provider/notifications-provider");

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root!.render(createElement(NotificationsProvider, null, null));
  });

  // Let `await initializeSocket()` bind the listeners.
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

const failureToasts = () =>
  toast.error.mock.calls.filter(
    ([, options]) => (options as { id?: string })?.id === "socket-init-error",
  );

describe("the bell on a socket that has not connected yet", () => {
  it("binds the forced logout anyway, and it works once the socket connects", async () => {
    await mountProvider();

    expect(
      fake.socket.count("securityAction"),
      "o forceLogout não foi registrado",
    ).toBe(1);

    await act(async () => {
      fake.socket.fire("connect_error", new Error("Serviço indisponível"));
      fake.socket.connected = true;
      fake.socket.fire("connect");
    });

    await act(async () => {
      fake.socket.fire("securityAction", { reason: "access_revoked" });
    });

    expect(forceLogout).toHaveBeenCalledWith("user_revoked");
  });

  it("says once that it could not connect, and nothing about drops after connecting", async () => {
    await mountProvider();

    fake.socket.fire("connect_error", new Error("Serviço indisponível"));
    fake.socket.fire("connect_error", new Error("Serviço indisponível"));

    expect(
      failureToasts(),
      "a falha da primeira conexão sumiu da tela",
    ).toHaveLength(1);

    await act(async () => {
      fake.socket.connected = true;
      fake.socket.fire("connect");
      fake.socket.connected = false;
      fake.socket.fire("disconnect");
      fake.socket.fire("connect_error", new Error("transport error"));
    });

    expect(failureToasts()).toHaveLength(1);
  });

  it("leaves no connect_error listener of its own behind when it unmounts", async () => {
    await mountProvider();

    await act(async () => root!.unmount());
    root = null;

    expect(fake.socket.count("connect_error")).toBe(0);
  });
});
