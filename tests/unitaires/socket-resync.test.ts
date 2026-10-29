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
 * The panel's socket coming back after the server dropped it.
 *
 * The API does not replay anything: its emits are fire-and-forget through the
 * Redis adapter, with no connection-state recovery. Whatever happened while a
 * tab was reconnecting — a deploy restarting half the replicas, a Wi-Fi blink
 * — is simply gone for that tab. Socket.IO brings the TRANSPORT back on its
 * own and the subscription hooks rejoin their rooms, but no screen asked the
 * API again, so the Rotas board kept showing a route as PLANNED that was
 * released while it was offline, until somebody pressed Atualizar.
 *
 * What is pinned here is the signal every screen reconciles on: one resync per
 * reconnection, never on the first connection of a session (the page was
 * just rendered from the server, there is nothing to catch up on).
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

/** The server side of every connection, newest last. */
const serverSockets: Array<{ conn: { close(): void } }> = [];

let socketModule: typeof import("@/socket");

type SocketServer = new (
  http: HttpServer,
  options: unknown,
) => {
  on(
    event: "connection",
    listener: (socket: { conn: { close(): void } }) => void,
  ): void;
};

beforeAll(async () => {
  if (!hasServer) return;

  const { Server } = createRequire(__filename)(API_SOCKET_IO) as {
    Server: SocketServer;
  };

  http = createServer();
  const io = new Server(http, { transports: ["websocket"] });

  io.on("connection", (socket) => serverSockets.push(socket));

  await new Promise<void>((done) => http.listen(0, "127.0.0.1", done));

  process.env.PUBLIC_API_URL = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  socketModule = await import("@/socket");
});

afterEach(() => {
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
  "a reconnection after the server dropped the transport",
  () => {
    it("asks every screen to reconcile once, and not on the first connection", async () => {
      // No jitter and no backoff randomisation: the test is about WHETHER the
      // resync fires, the spread is a detail of when.
      vi.spyOn(Math, "random").mockReturnValue(0);

      const resync = vi.fn();
      const stop = socketModule.onRealtimeResync(resync);

      // initializeSocket hands the socket over before it connects.
      await socketModule.initializeSocket();
      await until(() => socketModule.isSocketConnected(), 5_000);
      await sleep(150);

      expect(
        resync,
        "a primeira conexão não perdeu nada",
      ).not.toHaveBeenCalled();

      // What a deploy looks like from the tab: the transport closes under it and
      // the manager reconnects by itself.
      const before = serverSockets.length;
      serverSockets.at(-1)?.conn.close();

      expect(
        await until(
          () =>
            serverSockets.length > before && socketModule.isSocketConnected(),
          5_000,
        ),
        "o socket não reconectou",
      ).toBe(true);

      expect(
        await until(() => resync.mock.calls.length > 0, 3_000),
        "a tela não foi avisada de que perdeu eventos na reconexão",
      ).toBe(true);

      // One reconnection, one reconciliation.
      await sleep(150);
      expect(resync).toHaveBeenCalledTimes(1);

      stop();
    });

    it("does not resync a new session's first connection", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      await socketModule.initializeSocket();
      await until(() => socketModule.isSocketConnected(), 5_000);

      // Logout and login again: a new socket, rendered fresh from the server.
      socketModule.disconnectSocket();

      const resync = vi.fn();
      const stop = socketModule.onRealtimeResync(resync);

      await socketModule.initializeSocket();
      await until(() => socketModule.isSocketConnected(), 5_000);
      await sleep(150);

      expect(resync).not.toHaveBeenCalled();

      stop();
    });

    it("stops calling a screen that unsubscribed", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const gone = vi.fn();
      const stay = vi.fn();

      socketModule.onRealtimeResync(gone)();
      const stop = socketModule.onRealtimeResync(stay);

      // initializeSocket hands the socket over before it connects.
      await socketModule.initializeSocket();
      await until(() => socketModule.isSocketConnected(), 5_000);

      const before = serverSockets.length;
      serverSockets.at(-1)?.conn.close();

      await until(
        () => serverSockets.length > before && socketModule.isSocketConnected(),
        5_000,
      );
      await until(() => stay.mock.calls.length > 0, 3_000);

      expect(stay).toHaveBeenCalledTimes(1);
      expect(gone).not.toHaveBeenCalled();

      stop();
    });
  },
);
