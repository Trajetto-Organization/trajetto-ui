// @vitest-environment node
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { QueryObserver } from "react-query";
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
 * A catalogue edited in one session reaching the pickers of another
 * (decision 2.3; Entregas 1, 3 and 4).
 *
 * The API emits `catalogChanged { businessId, entity }` in the company's room
 * on every write to a catalogue. Nothing in the web listened, so the other
 * session's "Nova Entrega" kept a shipper the MASTER had just deactivated
 * until somebody reloaded.
 *
 * A real Socket.IO server (borrowed from the API's dependencies) emits the
 * event; the queries are the app's own QueryClient with live observers, as a
 * mounted picker would hold them.
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

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const OTHER_BUSINESS = "018f0000-0000-7000-8000-00000000000c";

type ServerSocket = { emit(event: string, payload: unknown): void };

let http: HttpServer;
const serverSockets: ServerSocket[] = [];

let socketModule: typeof import("@/socket");
let queryClient: typeof import("@/lib/query-client-props").queryClientProps;

beforeAll(async () => {
  if (!hasServer) return;

  const { Server } = createRequire(__filename)(API_SOCKET_IO) as {
    Server: new (
      http: HttpServer,
      options: unknown,
    ) => {
      on(event: "connection", listener: (socket: ServerSocket) => void): void;
    };
  };

  http = createServer();
  const io = new Server(http, { transports: ["websocket"] });

  io.on("connection", (socket) => serverSockets.push(socket));

  await new Promise<void>((done) => http.listen(0, "127.0.0.1", done));

  process.env.PUBLIC_API_URL = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  socketModule = await import("@/socket");
  queryClient = (await import("@/lib/query-client-props")).queryClientProps;
});

const unsubscribers: Array<() => void> = [];

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  queryClient?.clear();
  socketModule?.disconnectSocket();
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
    await sleep(20);
  }

  return condition();
}

/** A query somebody is rendering, counting how often the API is asked. */
function onScreen(queryKey: unknown[]) {
  const fetches = vi.fn(async () => ["row"]);

  const observer = new QueryObserver(queryClient, {
    queryKey,
    queryFn: fetches,
  });
  unsubscribers.push(observer.subscribe(() => undefined));

  return fetches;
}

async function connectedServerSocket(): Promise<ServerSocket> {
  const before = serverSockets.length;

  await socketModule.initializeSocket();

  expect(
    await until(
      () => socketModule.isSocketConnected() && serverSockets.length > before,
      5_000,
    ),
  ).toBe(true);

  return serverSockets[serverSockets.length - 1];
}

describe.skipIf(!hasServer)("catalogChanged", () => {
  it("refetches the edited catalogue of that company, and nothing else", async () => {
    const server = await connectedServerSocket();

    const shippers = onScreen(["shipper", BUSINESS]);
    const shipperSearch = onScreen(["shipper", BUSINESS, { search: "alfa" }]);
    const otherCompany = onScreen(["shipper", OTHER_BUSINESS]);
    const drivers = onScreen(["driver", BUSINESS]);

    await until(
      () => shippers.mock.calls.length === 1 && drivers.mock.calls.length === 1,
      1_000,
    );

    server.emit("catalogChanged", { businessId: BUSINESS, entity: "shipper" });

    expect(
      await until(() => shippers.mock.calls.length === 2, 2_000),
      "o seletor de embarcadores continuou com a lista antiga",
    ).toBe(true);

    expect(shipperSearch).toHaveBeenCalledTimes(2);

    await sleep(100);

    expect(
      otherCompany,
      "refez a lista de outra empresa",
    ).toHaveBeenCalledTimes(1);
    expect(drivers, "refez um catálogo que não mudou").toHaveBeenCalledTimes(1);
  });

  it("reaches the keys each entity is read under", async () => {
    const server = await connectedServerSocket();

    const occurrenceTypes = onScreen(["occurrence-types-select", BUSINESS]);
    const reasons = onScreen(["status_change_reason", BUSINESS]);
    const templates = onScreen(["delivery_message_template", BUSINESS]);
    const profiles = onScreen(["profile", BUSINESS]);

    await sleep(50);

    for (const entity of [
      "occurrence_type",
      "status_reason",
      "message_template",
      "profile_access",
    ]) {
      server.emit("catalogChanged", { businessId: BUSINESS, entity });
    }

    expect(
      await until(
        () =>
          [occurrenceTypes, reasons, templates, profiles].every(
            (fetches) => fetches.mock.calls.length === 2,
          ),
        2_000,
      ),
    ).toBe(true);
  });

  it("marks a closed picker stale, so it refetches when it opens again", async () => {
    const server = await connectedServerSocket();

    queryClient.setQueryData(["vehicle", BUSINESS], {
      pages: [],
      pageParams: [],
    });

    server.emit("catalogChanged", { businessId: BUSINESS, entity: "vehicle" });

    expect(
      await until(
        () =>
          queryClient.getQueryState(["vehicle", BUSINESS])?.isInvalidated ===
          true,
        2_000,
      ),
    ).toBe(true);
  });

  it("ignores payloads it does not understand", async () => {
    const server = await connectedServerSocket();

    const shippers = onScreen(["shipper", BUSINESS]);
    await sleep(50);

    server.emit("catalogChanged", { businessId: BUSINESS, entity: "planet" });
    server.emit("catalogChanged", { entity: "shipper" });
    server.emit("catalogChanged", "shipper");

    await sleep(150);

    expect(shippers).toHaveBeenCalledTimes(1);
  });
});
