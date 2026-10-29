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
 * The panel's socket authenticates with one-use tickets, never the token.
 *
 * The page used to fetch the access token through a Server Action and put it
 * in `auth.token`. Now each handshake carries a fresh ticket minted on the
 * server (actions/session → POST /user/socket-ticket): this proves what the
 * server actually receives, on the first attempt and on every retry, and
 * that a session the mint refuses goes to the reload recovery.
 *
 * A real Socket.IO server, borrowed from the API's own dependencies.
 */
const minted: string[] = [];
let mintAnswer: () =>
  | { ok: true; ticket: string }
  | { ok: false; status: number; code: string | null } = () => {
  const ticket = `ticket-${minted.length + 1}`;

  minted.push(ticket);

  return { ok: true, ticket };
};

vi.mock("@/actions/session", () => ({
  mintSocketTicket: async () => mintAnswer(),
}));

// Anything still reaching for the cookie reader would be a regression.
vi.mock("@/actions/cookies", () => ({
  getCookies: async () => {
    throw new Error("the browser must not read the session cookie");
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
const received: Array<Record<string, unknown>> = [];

let socketModule: typeof import("@/socket");

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

  io.use((socket, next) => {
    received.push({ ...(socket.handshake.auth ?? {}) });

    if (refusals > 0) {
      refusals -= 1;
      return next(
        Object.assign(new Error("Ticket de conexão inválido"), {
          data: { code: "SOCKET_TICKET_INVALID" },
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
  received.length = 0;
  minted.length = 0;
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

describe.skipIf(!hasServer)("the socket handshake", () => {
  it("sends a minted ticket and no token", async () => {
    await socketModule.initializeSocket();

    expect(await until(() => socketModule.isSocketConnected(), 4_000)).toBe(
      true,
    );

    expect(received).toEqual([{ ticket: "ticket-1" }]);
  });

  it("mints a new ticket for the retry after a spent one is refused", async () => {
    refusals = 1;

    await socketModule.initializeSocket();

    expect(await until(() => socketModule.isSocketConnected(), 6_000)).toBe(
      true,
    );

    // SOCKET_TICKET_INVALID is not a session verdict: no reload, a fresh
    // ticket on the next attempt, never the same one twice.
    expect(received).toEqual([{ ticket: "ticket-1" }, { ticket: "ticket-2" }]);
  });

  it("does not open a socket for a session the mint already refused", async () => {
    mintAnswer = () => ({
      ok: false,
      status: 401,
      code: "AUTH_SESSION_INVALIDATED",
    });

    try {
      await expect(socketModule.initializeSocket()).rejects.toThrow(
        /Sessão expirada/,
      );
      expect(socketModule.getSocket()).toBeNull();
      expect(received).toEqual([]);
    } finally {
      mintAnswer = () => {
        const ticket = `ticket-${minted.length + 1}`;

        minted.push(ticket);

        return { ok: true, ticket };
      };
    }
  });
});
