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
 * A session whose FIRST connection only came after failed attempts.
 *
 * The resync skips a session's first connection because the page was just
 * rendered from the server. That holds only when the socket came up right
 * behind the render. A tab opened during a deploy, or while the database
 * blinked, has its handshake refused and retried for seconds (up to a minute
 * with the refusal backoff). Whatever the API emitted in the meantime is
 * lost exactly as it is on a reconnection, and the first `connect` that
 * finally arrives is the only moment the screens can catch up.
 *
 * A real Socket.IO server, borrowed from the API's own dependencies.
 */
vi.mock("@/actions/session", () => ({
  mintSocketTicket: async () => ({ ok: true, ticket: "valid-ticket" }),
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

let socketModule: typeof import("@/socket");

type Middleware = (socket: unknown, next: (error?: Error) => void) => void;

type SocketServer = new (
  http: HttpServer,
  options: unknown,
) => { use(middleware: Middleware): void };

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

  await new Promise<void>((done) => http.listen(0, "127.0.0.1", done));

  process.env.PUBLIC_API_URL = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  socketModule = await import("@/socket");
});

afterEach(() => {
  refusals = 0;
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
  "a first connection that only came after a refusal",
  () => {
    it("asks every screen to reconcile once, like a reconnection", async () => {
      // No jitter: the refusal retry waits 500 ms and the resync fires at once.
      vi.spyOn(Math, "random").mockReturnValue(0);

      const resync = vi.fn();
      const stop = socketModule.onRealtimeResync(resync);

      refusals = 1;

      // The first attempt is refused; initializeSocket still hands the socket
      // over (socket-refusal.test.ts pins how the refusal is reported).
      await socketModule.initializeSocket();

      expect(
        await until(() => socketModule.isSocketConnected(), 4_000),
        "o socket não conectou depois da recusa",
      ).toBe(true);

      expect(
        await until(() => resync.mock.calls.length > 0, 2_000),
        "a tela ficou com o que foi renderizado antes da recusa",
      ).toBe(true);

      await sleep(150);
      expect(resync).toHaveBeenCalledTimes(1);

      stop();
    });

    it("still does not resync a first connection that nothing held back", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const resync = vi.fn();
      const stop = socketModule.onRealtimeResync(resync);

      // initializeSocket hands the socket over before it connects.
      await socketModule.initializeSocket();
      await until(() => socketModule.isSocketConnected(), 4_000);
      await sleep(150);

      expect(resync).not.toHaveBeenCalled();

      stop();
    });
  },
);
