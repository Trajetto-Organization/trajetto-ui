// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * What `initializeSocket()` hands a screen while the API refuses the
 * handshake, with socket.io-client replaced by a fake.
 *
 * socket-listeners-after-refusal.test.ts pins the same thing against a real
 * Socket.IO server, borrowed from the API's node_modules, and skips itself
 * when they are not there: the web's CI never checks the API out. This file is
 * the part that runs everywhere.
 *
 * `initializeSocket()` used to REJECT on the first `connect_error`, and every
 * listening screen does `initializeSocket().then(bind).catch(nothing)`. A tab
 * opened during a deploy never bound a listener, not even after the refusal
 * retry connected, and stayed without realtime until a reload.
 */
vi.mock("@/actions/session", () => ({
  mintSocketTicket: async () => ({ ok: true, ticket: "valid-ticket" }),
}));

// The subscription hooks' effects are run by hand: the contract is what this
// file is about, not rendering.
const effects = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (typeof cleanup === "function") effects.cleanups.push(cleanup);
  },
}));

const fake = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  /**
   * One per `io()` call, so a timer left by a previous test (the logout's
   * delayed `disconnect`) lands on a socket nobody looks at any more.
   */
  const makeSocket = () => {
    const handlers = new Map<string, Set<Listener>>();

    const socket = {
      connected: false,
      active: false,
      connects: 0,
      emitted: [] as Array<[string, unknown]>,
      connect() {
        socket.connects += 1;
        socket.active = true;
        return socket;
      },
      disconnect() {
        socket.connected = false;
        socket.active = false;
        return socket;
      },
      on(event: string, listener: Listener) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(listener);
        return socket;
      },
      once(event: string, listener: Listener) {
        const wrapper: Listener = (...args) => {
          socket.off(event, wrapper);
          listener(...args);
        };
        return socket.on(event, wrapper);
      },
      off(event: string, listener?: Listener) {
        if (listener) handlers.get(event)?.delete(listener);
        else handlers.delete(event);
        return socket;
      },
      emit(event: string, payload?: unknown) {
        socket.emitted.push([event, payload]);
        return socket;
      },
      fire(event: string, ...args: unknown[]) {
        [...(handlers.get(event) ?? [])].forEach((listener) =>
          listener(...args),
        );
      },
    };

    return socket;
  };

  const state = { current: null as ReturnType<typeof makeSocket> | null };

  return {
    state,
    io: vi.fn(() => {
      state.current = makeSocket();
      return state.current;
    }),
  };
});

vi.mock("socket.io-client", () => ({ io: fake.io }));

let socketModule: typeof import("@/socket");

beforeAll(async () => {
  process.env.PUBLIC_API_URL = "http://api.test";
  socketModule = await import("@/socket");
});

afterEach(() => {
  while (effects.cleanups.length) effects.cleanups.pop()!();

  socketModule.disconnectSocket();
  fake.io.mockClear();
  fake.state.current = null;
  vi.restoreAllMocks();
});

const created = () => {
  if (!fake.state.current) throw new Error("io() not called yet");
  return fake.state.current;
};

/** What the API's handshake middleware does to a refused socket. */
function refuse(): void {
  const socket = created();

  // socket.io-client ends the socket on a server refusal: `active` goes
  // false, and only the web's own retry brings it back.
  socket.active = false;
  socket.fire(
    "connect_error",
    Object.assign(new Error("Serviço indisponível"), {
      data: { code: "SOCKET_UNAVAILABLE" },
    }),
  );
}

function accept(): void {
  const socket = created();

  socket.connected = true;
  socket.fire("connect");
}

async function refusedThenRetried(): Promise<void> {
  // No backoff jitter: the refusal retry waits 500 ms.
  vi.spyOn(Math, "random").mockReturnValue(0);

  await vi.waitFor(() => expect(fake.io).toHaveBeenCalledTimes(1));

  refuse();

  await vi.waitFor(() => expect(created().connects).toBe(2), {
    timeout: 2_000,
  });

  accept();
}

describe("a screen that asks for the socket during a refused handshake", () => {
  it("binds its listener and hears the API once the retry connects", async () => {
    const heard = vi.fn();

    // The exact shape of useRouteEvents, the chat panes and the bell.
    const asked = socketModule
      .initializeSocket()
      .then((socket) => {
        socket.on("routeEvent", heard);
      })
      .catch(() => undefined);

    await refusedThenRetried();
    await asked;

    created().fire("routeEvent", { routeId: "r-1042", status: "RELEASED" });

    expect(
      heard,
      "a tela caiu no catch da primeira recusa e ficou sem realtime até recarregar",
    ).toHaveBeenCalledWith({ routeId: "r-1042", status: "RELEASED" });
  });

  it("still reports the refusal through the connection status", async () => {
    const asked = socketModule.initializeSocket();

    await vi.waitFor(() => expect(fake.io).toHaveBeenCalledTimes(1));
    await expect(asked).resolves.toBe(created());

    refuse();

    expect(socketModule.getConnectionStatus()).toMatchObject({
      isConnected: false,
      isConnecting: false,
      hasConnectionError: true,
      errorMessage: "Serviço indisponível",
    });
  });
});

describe("the room subscriptions on a socket handed over before it connects", () => {
  const subscriptions = (event: string) =>
    created()
      .emitted.filter(([name]) => name === event)
      .map(([, payload]) => payload);

  it("joins the chat room exactly once, on the connection after the refusal", async () => {
    const { useChatSubscription } =
      await import("@/features/deliveries/chat/lib/use-chat-socket");

    useChatSubscription("biz-1");

    await refusedThenRetried();

    // Neither the one a disconnected socket would buffer AND the one on
    // `connect`, nor none at all.
    expect(subscriptions("chatSubscribe")).toEqual([{ businessId: "biz-1" }]);
  });

  it("joins the operations room exactly once, on the connection after the refusal", async () => {
    const { useOperationsSubscription } =
      await import("@/hooks/use-operations-subscription");

    useOperationsSubscription("biz-1");

    await refusedThenRetried();

    expect(subscriptions("operationsSubscribe")).toEqual([
      { businessId: "biz-1" },
    ]);
  });

  it("subscribes by hand when the socket it gets is already connected", async () => {
    const { useChatSubscription } =
      await import("@/features/deliveries/chat/lib/use-chat-socket");

    const first = socketModule.initializeSocket();
    await vi.waitFor(() => expect(fake.io).toHaveBeenCalledTimes(1));
    await first;
    accept();

    // `connect` already fired: nothing but the hook itself can subscribe.
    useChatSubscription("biz-1");
    await vi.waitFor(() =>
      expect(subscriptions("chatSubscribe")).toEqual([{ businessId: "biz-1" }]),
    );
  });
});
