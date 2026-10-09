// @vitest-environment node
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * A screen that asks for the socket while the API is refusing the handshake.
 *
 * `initializeSocket()` used to REJECT on the first `connect_error`. Every
 * screen that listens — the bell and its forced logout, the Rotas board, the
 * chat — does `initializeSocket().then(bind).catch(nothing)`, so a tab opened
 * during a deploy or a database blink fell into the `.catch` and never bound
 * a single listener. The refusal retry connected a second later, the socket
 * was fine, and the tab stayed deaf until somebody reloaded it.
 *
 * A real Socket.IO server, borrowed from the API's own dependencies.
 */
vi.mock("@/actions/session", () => ({
  mintSocketTicket: async () => ({ ok: true, ticket: "valid-ticket" }),
}));

// The subscription hook's effect is run by hand: the transport is what this
// file is about, not rendering.
const effects = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (typeof cleanup === "function") effects.cleanups.push(cleanup);
  },
}));

const API_SOCKET_IO = resolve(
  process.cwd(),
  "..",
  "trajetto-api",
  "node_modules",
  "socket.io",
);
const hasServer = existsSync(API_SOCKET_IO);

let http: HttpServer;
let refusals = 0;

/** Every `operationsSubscribe` the server received, in order. */
const subscribes: unknown[] = [];

let emitToAll: (event: string, payload: unknown) => void;

let socketModule: typeof import("@/socket");

interface ServerSocket {
  on(event: string, listener: (payload: unknown) => void): void;
}

type Middleware = (socket: unknown, next: (error?: Error) => void) => void;

type SocketServer = new (
  http: HttpServer,
  options: unknown,
) => {
  use(middleware: Middleware): void;
  on(event: "connection", listener: (socket: ServerSocket) => void): void;
  emit(event: string, payload: unknown): void;
};

beforeAll(async () => {
  if (!hasServer) return;

  const { Server } = createRequire(__filename)(API_SOCKET_IO) as {
    Server: SocketServer;
  };

  http = createServer();
  const io = new Server(http, { transports: ["websocket"] });

  io.use((_socket, next) => {
    if (refusals > 0) {
      refusals -= 1;
      return next(
        Object.assign(new Error("Serviço indisponível"), {
          data: { code: "SOCKET_UNAVAILABLE" },
        }),
      );
    }

    next();
  });

  io.on("connection", (socket) => {
    socket.on("operationsSubscribe", (payload) => subscribes.push(payload));
  });

  emitToAll = (event, payload) => io.emit(event, payload);

  await new Promise<void>((done) => http.listen(0, "127.0.0.1", done));

  process.env.PUBLIC_API_URL = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  socketModule = await import("@/socket");
});

afterEach(() => {
  while (effects.cleanups.length) effects.cleanups.pop()!();

  refusals = 0;
  subscribes.length = 0;
  socketModule?.disconnectSocket();
  vi.restoreAllMocks();
});

afterAll(async () => {
  socketModule?.disconnectSocket();
  if (hasServer) await new Promise<void>((done) => http.close(() => done()));
});

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function until(condition: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;

  while (Date.now() < deadline) {
    if (condition()) return true;
    await sleep(25);
  }

  return condition();
}

describe.skipIf(!hasServer)(
  "a screen that asked for the socket during a refused handshake",
  () => {
    it("hears what the API emits once the retry connects", async () => {
      // No backoff jitter: the refusal retry waits 500 ms.
      vi.spyOn(Math, "random").mockReturnValue(0);

      refusals = 1;

      const heard = vi.fn();

      // The exact shape of every listening screen (useRouteEvents, the chat,
      // the bell).
      await socketModule
        .initializeSocket()
        .then((socket) => {
          socket.on("routeEvent", heard);
        })
        .catch(() => undefined);

      expect(
        await until(() => socketModule.isSocketConnected(), 4_000),
        "o socket não conectou depois da recusa",
      ).toBe(true);

      emitToAll("routeEvent", { routeId: "r-1042", status: "RELEASED" });

      expect(
        await until(() => heard.mock.calls.length > 0, 2_000),
        "a tela caiu no catch da primeira recusa e ficou sem realtime até recarregar",
      ).toBe(true);

      expect(heard).toHaveBeenCalledWith({
        routeId: "r-1042",
        status: "RELEASED",
      });
    });

    it("joins the operations room exactly once when the retry connects", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      refusals = 1;

      const { useOperationsSubscription } =
        await import("@/hooks/use-operations-subscription");

      useOperationsSubscription("biz-1");

      expect(
        await until(
          () => socketModule.isSocketConnected() && subscribes.length > 0,
          4_000,
        ),
        "o MASTER ficou fora da sala de operações depois da recusa",
      ).toBe(true);

      // Neither a subscription queued while disconnected AND the one on
      // `connect`, nor none at all.
      await sleep(200);
      expect(subscribes).toEqual([{ businessId: "biz-1" }]);
    });
  },
);
