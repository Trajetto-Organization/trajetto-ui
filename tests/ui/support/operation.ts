import { expect, test, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";
import { basename } from "node:path";

/**
 * Setting up an operation through the API, the way another user would.
 *
 * Shared because two specs were building the same route out of the same
 * copy-pasted four helpers, and the copies had already drifted — one of them
 * knew that picking a delivery out of the fixture eats it, the other did not.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";
const API = process.env.LOAD_BASE_URL ?? "http://localhost:3334";

/**
 * A manager of this spec FILE's own, out of the fifty the fixture seeds.
 *
 * Every socket handshake is counted per user — thirty a minute, which is
 * several tabs plus socket.io's reconnect backoff with room to spare. Run
 * three workers over forty-odd tests that all sign in as
 * `managerTokens[0]`, each navigation opening a connection, and the suite
 * spends one person's budget: the API starts refusing handshakes, the board
 * hears nothing, and the realtime test fails with "a rota liberada não
 * apareceu" — a message about the product for a problem that is entirely
 * about the fixture.
 *
 * Chosen by file name so a given spec always gets the same user (its data is
 * stable between runs) and different specs never share one.
 */
function managerForThisSpec(): string {
  const managers: string[] = CONTEXT.managerTokens;

  let name = "default";

  try {
    name = basename(test.info().file);
  } catch {
    // Outside a test (a helper imported at module load); the first is fine.
  }

  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100_000;
  }

  return managers[hash % managers.length];
}

/** Signs in as the fixture's manager and lands on a screen. */
async function open(page: Page, path: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerForThisSpec(),
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${managerForThisSpec()}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** NDJSON is what the listing endpoints answer; this reads one. */
function ndjson(body: string): Record<string, unknown>[] {
  return body
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

/**
 * A delivery of this test's own, so nothing is consumed.
 *
 * The first version picked a PENDING delivery from the fixture. It worked
 * until it did not: every run put one on a route, and after a handful of runs
 * the listing's first page was all routed and the test failed with
 * DELIVERY_ALREADY_ON_ROUTE — a failure about the fixture, not about the
 * product. A test that eats its own inputs has a countdown in it.
 */
async function ownDelivery(recipient: string): Promise<string> {
  const shippers = await api(
    `/shipper/list-shipper?page=1&pageSize=1&businessId=${CONTEXT.businessId}`,
  );

  expect(shippers.status).toBe(200);

  const shipperId = ndjson(await shippers.text())[1]?.id as string | undefined;

  expect(shipperId, "o fixture não tem embarcador").toBeTruthy();

  const created = await api(`/delivery/create-delivery/${CONTEXT.businessId}`, {
    method: "POST",
    body: JSON.stringify({
      shipperId,
      recipient_name: recipient,

      // Required on manual entry: the route is built from this address.
      cep: "01001000",

      city: "São Paulo",
      uf: "SP",
      street: "Rua do Tempo Real",
      address_number: "1",
    }),
  });

  const body = await created.text();

  expect(created.status, `não foi possível criar a entrega: ${body}`).toBe(201);

  return JSON.parse(body).data.id;
}

/** Any vehicle in operation. A route cannot be released without one. */
async function anyVehicle(): Promise<string> {
  const response = await api(`/vehicle/list-vehicle?page=1&pageSize=5`);

  expect(response.status).toBe(200);

  const vehicle = ndjson(await response.text())
    .slice(1)
    .find((row) => row.status === "ACTIVE");

  expect(vehicle, "o fixture não tem veículo ativo").toBeTruthy();

  return vehicle!.id as string;
}

/** Builds a route out of the deliveries handed to it. */
async function createRoute(
  deliveryIds: string[],
  vehicleId: string,
  routeName: string,
): Promise<{ id: string; code: number; name: string }> {
  const created = await api(`/route/create-route/${CONTEXT.businessId}`, {
    method: "POST",
    body: JSON.stringify({
      driverId: CONTEXT.driverIds[0],

      // Set at creation: releasing requires one, and the release is the event
      // the realtime spec is about.
      vehicleId,

      scheduled_date: new Date().toISOString(),
      name: routeName,
      deliveryIds,
    }),
  });

  const body = await created.text();

  expect(created.status, `não foi possível criar a rota: ${body}`).toBe(201);

  return JSON.parse(body).data;
}

export {
  CONTEXT,
  API,
  BASE,
  managerForThisSpec,
  api,
  anyVehicle,
  createRoute,
  ndjson,
  open,
  ownDelivery,
};
