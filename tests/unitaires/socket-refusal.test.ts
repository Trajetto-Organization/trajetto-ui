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

import { refusalRetryDelay } from "@/lib/socket-refusal";

/**
 * The panel's socket after the API refuses a handshake for a reason that is
 * not the credential.
 *
 * socket.io-client retries a dropped transport by itself, but a refusal from
 * the server's middleware ends the socket — `active` goes false — and this
 * client only acted on the two auth codes. A handshake rate-limited during a
 * deploy, or refused because the database blinked, left the panel mute with no
 * error on screen until somebody pressed F5.
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
let refusalCode = "SOCKET_UNAVAILABLE";
let handshakes = 0;

let socketModule: typeof import("@/socket");

/** The slice of socket.io's server this test touches (the package is the API's). */
interface HandshakeSocket {
  handshake: { auth?: Record<string, unknown> };
}

type Middleware = (
  socket: HandshakeSocket,
  next: (error?: Error) => void,
) => void;

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
    handshakes += 1;

    if (refusals > 0) {
      refusals -= 1;
      return next(
        Object.assign(new Error("Serviço indisponível"), {
          data: { code: refusalCode },
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
  socketModule?.disconnectSocket();
  refusals = 0;
  refusalCode = "SOCKET_UNAVAILABLE";
  handshakes = 0;
  vi.unstubAllGlobals();
});

afterAll(async () => {
  socketModule?.disconnectSocket();
  if (hasServer) await new Promise<void>((done) => http.close(() => done()));
});

async function until(condition: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;

  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((done) => setTimeout(done, 50));
  }

  return condition();
}

describe.skipIf(!hasServer)(
  "a handshake refused by the server, not for the token",
  () => {
    it("is reported, tried again on its own, and connects", async () => {
      refusals = 1;

      // initializeSocket hands the socket over before it connects, refusal or
      // not: a rejection here sent every screen to its `.catch`, and none of
      // them bound a listener even after the retry below connected. The
      // refusal is reported through the socket's own events and the status.
      const socket = await socketModule.initializeSocket();

      expect(socket, "initializeSocket não devolveu o socket").toBe(
        socketModule.getSocket(),
      );

      const reported: Array<
        ReturnType<typeof socketModule.getConnectionStatus>
      > = [];

      socket.on("connect_error", () => {
        reported.push(socketModule.getConnectionStatus());
      });

      expect(
        await until(() => socketModule.isSocketConnected(), 4_000),
        "o painel ficou mudo depois da recusa",
      ).toBe(true);

      expect(reported, "a recusa não foi reportada").toHaveLength(1);
      expect(reported[0]).toMatchObject({
        isConnected: false,
        hasConnectionError: true,
        errorMessage: "Serviço indisponível",
      });

      expect(handshakes).toBe(2);
      expect(socketModule.getConnectionStatus().hasConnectionError).toBe(false);
    });
  },
);

describe.skipIf(!hasServer)("a handshake refused for the credential", () => {
  it("renews the session through the middleware instead of retrying", async () => {
    const reload = vi.fn();
    const storage = new Map<string, string>();

    // Only what recoverExpiredSession touches.
    vi.stubGlobal("window", {
      location: { reload },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
      },
    });

    refusalCode = "AUTH_TOKEN_INVALID";
    refusals = 1;

    await socketModule.initializeSocket();

    expect(
      await until(() => reload.mock.calls.length > 0, 2_000),
      "a sessão vencida não foi renovada",
    ).toBe(true);

    // The reload IS the retry; a second handshake with the dead token would
    // be the loop this path exists to stop.
    await new Promise((done) => setTimeout(done, 1_600));
    expect(handshakes).toBe(1);
  });
});

describe("the pause after a refusal", () => {
  it("doubles from a second to a minute, with jitter either side", () => {
    expect(refusalRetryDelay(0, () => 0)).toBe(500);
    expect(refusalRetryDelay(3, () => 0.5)).toBe(8_000);
    expect(refusalRetryDelay(20, () => 0.5)).toBe(60_000);
  });
});
