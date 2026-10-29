import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

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
 * How Entregas and Rotas follow `routeEvent` (useRouteEvents).
 *
 * The hook refreshed the page 1.2 s after the LAST event, with no maximum
 * wait. Under a steady stream — a big tenant settles a stop every few
 * seconds all day — the timer restarted on every event and never fired: the
 * boards stopped following the operation exactly when it was busiest. And
 * events a few seconds apart each paid a full `router.refresh()`. It now
 * shares the Torre's scheduler: one refresh per burst, never two within ten
 * seconds.
 */
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
    off(event: string, listener?: Listener) {
      if (listener) handlers.get(event)?.delete(listener);
      else handlers.delete(event);
      return socket;
    },
    emit: () => socket,
    io: { on: () => undefined, off: () => undefined },
    fire(event: string, payload: unknown) {
      for (const listener of handlers.get(event) ?? []) listener(payload);
    },
  };

  return { socket, handlers };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => fake.socket,
  getSocket: () => fake.socket,
  onRealtimeResync: () => () => undefined,
}));

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/deliveries",
  useSearchParams: () => new URLSearchParams(),
}));

import {
  MIN_GAP_MS,
  SETTLE_MS,
  useRouteEvents,
} from "@/hooks/use-route-events";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const unmounts: Array<() => Promise<void>> = [];

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  });
  router.refresh.mockClear();
});

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  fake.handlers.clear();
  vi.useRealTimers();
});

async function mountBoard() {
  const Board = () => {
    useRouteEvents();
    return null;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(Board));
  });

  // Let `initializeSocket().then(...)` bind the listener.
  await act(async () => {
    await Promise.resolve();
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
}

/** One route event every `everyMs`, for `forMs`. */
async function stream(everyMs: number, forMs: number) {
  for (let elapsed = 0; elapsed < forMs; elapsed += everyMs) {
    await act(async () => {
      fake.socket.fire("routeEvent", { type: "route-stop.settled" });
      vi.advanceTimersByTime(everyMs);
    });
  }
}

describe("routeEvent on the server-rendered boards", () => {
  it("uses the Torre's window: 1.5 s to gather, 10 s between refreshes", () => {
    expect(SETTLE_MS).toBe(1_500);
    expect(MIN_GAP_MS).toBe(10_000);
  });

  it("still refreshes under a steady stream of events", async () => {
    await mountBoard();

    // An event every 500 ms for 12 s: the old debounce never fired.
    await stream(500, 12_000);

    expect(
      router.refresh.mock.calls.length,
      "Entregas e Rotas pararam de acompanhar a operação",
    ).toBeGreaterThanOrEqual(1);
  });

  it("refreshes at most once per ten seconds when events are spaced out", async () => {
    await mountBoard();

    // An event every 3 s for 21 s: one refresh each with the old debounce.
    await stream(3_000, 21_000);

    await act(async () => {
      vi.advanceTimersByTime(MIN_GAP_MS);
    });

    const calls = router.refresh.mock.calls.length;

    expect(calls).toBeGreaterThanOrEqual(2);
    expect(calls).toBeLessThanOrEqual(3);
  });

  it("is one refresh for a burst", async () => {
    await mountBoard();

    await act(async () => {
      for (let index = 0; index < 12; index += 1) {
        fake.socket.fire("routeEvent", { type: "route-stop.settled" });
      }

      vi.advanceTimersByTime(SETTLE_MS + 100);
    });

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
