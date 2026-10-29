import * as React from "react";
import { createElement, act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The screens that have to catch up after the socket came back.
 *
 * The socket module announces a reconnection (socket-resync.test.ts pins
 * that); this file pins that the screens a dispatcher keeps open all day
 * actually LISTEN. Before, each of them only listened to its own events: the
 * Rotas board to `routeEvent`, the bell to `pushNotification`, the chat to
 * `chatMessage`. An event emitted while the tab was reconnecting — the API has
 * no replay — was lost for good, and the screen stayed wrong until somebody
 * pressed Atualizar or navigated.
 *
 * The socket is a fake: what is being asserted is the wiring of each screen,
 * not the transport.
 */
const fake = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  const handlers = new Map<string, Set<Listener>>();
  const resync = new Set<() => void>();

  const socket = {
    connected: true,
    on(event: string, listener: Listener) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(listener);
      return socket;
    },
    off(event: string, listener?: Listener) {
      if (listener) handlers.get(event)?.delete(listener);
      else handlers.delete(event);
      return socket;
    },
    emit: () => socket,
    io: { on: () => undefined, off: () => undefined },
    handlers(event: string): Listener[] {
      return [...(handlers.get(event) ?? [])];
    },
  };

  return { socket, resync, handlers };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => fake.socket,
  getSocket: () => fake.socket,
  disconnectSocket: () => undefined,
  onRealtimeResync: (listener: () => void) => {
    fake.resync.add(listener);
    return () => {
      fake.resync.delete(listener);
    };
  },
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

const revalidateTags = vi.fn(async (_tags: string[]) => []);
vi.mock("@/actions/revalidate", () => ({
  revalidateTags: (tags: string[]) => revalidateTags(tags),
}));

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/routes",
  useSearchParams: () => new URLSearchParams(),
}));

const MISSED = {
  id: "n-missed",
  title: "Rota liberada",
  message: "A rota 1042 foi liberada enquanto a aba reconectava.",
  type: "ROUTE",
  read: false,
  created_at: "2026-09-24T10:00:00.000Z",
};

const fetchNotificationStream = vi.fn(async (_request: unknown) => ({
  data: [MISSED],
  meta: { total: 1, unread: 1, nextCursor: null, hasMore: false },
}));
vi.mock("@/lib/notification-stream", () => ({
  fetchNotificationStream: (request: unknown) =>
    fetchNotificationStream(request),
}));

vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  THREADS_REFRESH_COALESCE_MS: 10,
  useChatAccess: () => ({ canUseChat: true }),
  useChatUnreadCount: () => 0,
}));

const reportDelivered = () => undefined;
vi.mock("@/features/deliveries/chat/lib/use-delivery-receipt", () => ({
  useDeliveryReceipt: () => reportDelivered,
}));

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  // The app's .tsx is compiled for Next's automatic runtime; esbuild here
  // emits the classic `React.createElement`, which needs React in scope.
  vi.stubGlobal("React", React);

  // happy-dom has no Notification API; the provider asks it for permission.
  vi.stubGlobal("Notification", {
    permission: "denied",
    requestPermission: async () => "denied",
  });
});

const mounted: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (mounted.length) await mounted.pop()!();

  fake.resync.clear();
  fake.handlers.clear();
  vi.clearAllMocks();
});

async function render(element: ReactElement): Promise<() => Promise<void>> {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  // Let `initializeSocket().then(...)` bind the listeners.
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });

  const unmount = async () => {
    await act(async () => root.unmount());
    container.remove();
  };

  mounted.push(unmount);

  return async () => {
    mounted.splice(mounted.indexOf(unmount), 1);
    await unmount();
  };
}

/** What the socket module does ~0–2 s after a reconnection. */
async function reconnect(): Promise<void> {
  await act(async () => {
    [...fake.resync].forEach((listener) => listener());
  });
}

async function until(condition: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;

  while (Date.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 25));
    });
  }

  return condition();
}

describe("the Rotas and Entregas boards", () => {
  it("refetch after a reconnection, through the same settle window as an event", async () => {
    const { useRouteEvents, SETTLE_MS } =
      await import("@/hooks/use-route-events");

    const Board = () => {
      useRouteEvents(undefined, ["update-route"]);
      return null;
    };

    await render(createElement(Board));

    expect(revalidateTags).not.toHaveBeenCalled();

    await reconnect();

    expect(
      await until(
        () => router.refresh.mock.calls.length > 0,
        SETTLE_MS + 1_500,
      ),
      "o quadro de Rotas continuou com o estado de antes da queda",
    ).toBe(true);

    // One render per burst: under `only-no-store` the tag revalidation only
    // rendered the page a second time (REV-17).
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(revalidateTags).not.toHaveBeenCalled();
  });

  it("refetch the proof queue on screen when a stop settles", async () => {
    const { useRouteEvents, SETTLE_MS } =
      await import("@/hooks/use-route-events");
    const { queryClientProps } = await import("@/lib/query-client-props");
    const { useQuery } = await import("react-query");

    // A stop delivered with a receipt puts a card in the proof queue; the
    // queue is a client panel the server re-render does not reach.
    const queue = vi.fn(async () => ["card"]);

    const Board = () => {
      useRouteEvents();
      useQuery(["proof_audit", "biz-1", "PENDING"], queue);
      return null;
    };

    await render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Board),
      ),
    );

    expect(await until(() => queue.mock.calls.length === 1, 1_000)).toBe(true);

    await act(async () => {
      fake.socket
        .handlers("routeEvent")
        .forEach((listener) =>
          listener({ routeId: "r-1", status: "COMPLETED" }),
        );
    });

    expect(
      await until(() => queue.mock.calls.length === 2, SETTLE_MS + 1_500),
      "a fila de comprovantes não foi atualizada pelo evento da rota",
    ).toBe(true);

    queryClientProps.clear();
  });

  it("stop listening when the board goes away", async () => {
    const { useRouteEvents } = await import("@/hooks/use-route-events");

    const Board = () => {
      useRouteEvents();
      return null;
    };

    const unmount = await render(createElement(Board));
    await unmount();

    expect(fake.resync.size).toBe(0);
  });
});

describe("the notification bell", () => {
  it("asks the server again after a reconnection and shows what it missed", async () => {
    const { NotificationsProvider, useNotificationsContext } =
      await import("@/app/(protected)/_components/layout/protected-provider/notifications-provider");

    let seen: string[] = [];

    const Bell = () => {
      seen = useNotificationsContext().notifications.map((n) => n.id);
      return null;
    };

    const securityChecks = vi.fn();
    window.addEventListener("security-check-required", securityChecks);

    await render(
      createElement(NotificationsProvider, null, createElement(Bell)),
    );

    expect(seen).toEqual([]);

    await reconnect();

    expect(
      await until(() => seen.includes("n-missed"), 1_000),
      "o sino não mostrou a notificação emitida durante a reconexão",
    ).toBe(true);

    expect(fetchNotificationStream).toHaveBeenCalledWith(
      expect.objectContaining({ includeRead: true }),
    );

    // Revoked permissions are re-read from /user/me as before.
    expect(securityChecks).toHaveBeenCalled();

    window.removeEventListener("security-check-required", securityChecks);
  });

  it("leaves everybody else's connect listeners in place when it unmounts", async () => {
    const { NotificationsProvider } =
      await import("@/app/(protected)/_components/layout/protected-provider/notifications-provider");

    // What the operations and chat subscriptions register to rejoin their
    // rooms, and what the socket module itself keeps its status with.
    const rejoin = () => undefined;
    fake.socket.on("connect", rejoin);

    const unmount = await render(
      createElement(NotificationsProvider, null, null),
    );
    await unmount();

    expect(fake.socket.handlers("connect")).toContain(rejoin);
    expect(fake.resync.size).toBe(0);
  });
});

describe("the notifications page", () => {
  it("refetches its list after a reconnection", async () => {
    const { NotificationsProvider } =
      await import("@/app/(protected)/_components/layout/protected-provider/notifications-provider");
    const { useNotificationInfiniteScroll } =
      await import("@/app/(protected)/_components/notification-list/hooks/notification-infinite-scroll");

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const Page = () => {
      useNotificationInfiniteScroll(true);
      return null;
    };

    await render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(NotificationsProvider, null, createElement(Page)),
      ),
    );

    invalidate.mockClear();

    await reconnect();

    expect(
      invalidate.mock.calls.some(
        ([key]) => Array.isArray(key) && key[0] === "notifications",
      ),
      "a lista de notificações não foi recarregada depois da reconexão",
    ).toBe(true);
  });
});

describe("the chat, from any screen", () => {
  it("refetches the conversations and the unread badge after a reconnection", async () => {
    const { ChatGlobalListener } =
      await import("@/features/deliveries/chat/global-listener");

    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ChatGlobalListener),
      ),
    );

    await reconnect();

    expect(
      await until(
        () =>
          invalidate.mock.calls.some(
            ([key]) => Array.isArray(key) && key[0] === "chat-threads",
          ),
        1_000,
      ),
      "o contador do chat continuou com o valor de antes da queda",
    ).toBe(true);
  });
});
