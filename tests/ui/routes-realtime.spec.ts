import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * Whether the Rotas board follows the operation, or only the page load.
 *
 * The API has emitted `routeEvent` — released, started, cancelled, completed,
 * and every stop that settles — since routes existed. A repository-wide
 * search for the event name found the emitter and no consumer at all: not in
 * the web, not in the app. So a route stayed RELEASED on a dispatcher's screen
 * for as long as they left the tab open while the driver had left an hour
 * earlier, and the only way to learn anything was to press Atualizar.
 *
 * The chain this exercises is the whole thing end to end: a write on the API
 * → the outbox/socket emit → the permissioned operations room → the browser's
 * listener → the cache tag → the refetch. Every link has its own test
 * somewhere; none of them proves the chain is connected.
 *
 * Nothing is clicked in the browser. The change is made through the API, by
 * another "user", exactly as a driver's phone would make it.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";
const API = process.env.LOAD_BASE_URL ?? "http://localhost:3334";

const TOKEN = CONTEXT.managerTokens[0];

async function open(page: Page, path: string): Promise<void> {
  await page.context().addCookies([
    { name: "tkey", value: TOKEN, domain: "localhost", path: "/" },
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
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
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
async function ownDelivery(): Promise<string> {
  const shippers = await api(
    `/shipper/list-shipper?page=1&pageSize=1&businessId=${CONTEXT.businessId}`,
  );

  expect(shippers.status).toBe(200);

  const shipperRows = (await shippers.text())
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const shipperId = shipperRows[1]?.id as string | undefined;

  expect(shipperId, "o fixture não tem embarcador").toBeTruthy();

  const created = await api(
    `/delivery/create-delivery/${CONTEXT.businessId}`,
    {
      method: "POST",
      body: JSON.stringify({
        shipperId,
        recipient_name: `Cliente tempo real ${Date.now()}`,

        // Required on manual entry: the route is built from this address.
        cep: "01001000",

        city: "São Paulo",
        uf: "SP",
        street: "Rua do Tempo Real",
        address_number: "1",
      }),
    },
  );

  const body = await created.text();

  expect(created.status, `não foi possível criar a entrega: ${body}`).toBe(201);

  return JSON.parse(body).data.id;
}

/** Any vehicle in operation. A route cannot be released without one. */
async function anyVehicle(): Promise<string> {
  const response = await api(`/vehicle/list-vehicle?page=1&pageSize=5`);

  expect(response.status).toBe(200);

  const rows = (await response.text())
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const vehicle = rows.slice(1).find((row) => row.status === "ACTIVE");

  expect(vehicle, "o fixture não tem veículo ativo").toBeTruthy();

  return vehicle.id as string;
}

/** Builds a route out of the first candidate the API accepts. */
async function createRoute(
  deliveryId: string,
  vehicleId: string,
  routeName: string,
): Promise<{ id: string; code: number; name: string }> {
  const created = await api(`/route/create-route/${CONTEXT.businessId}`, {
    method: "POST",
    body: JSON.stringify({
      driverId: CONTEXT.driverIds[0],

      // Set at creation: releasing requires one, and the release is the event
      // this whole test is about.
      vehicleId,

      scheduled_date: new Date().toISOString(),
      name: routeName,
      deliveryIds: [deliveryId],
    }),
  });

  const body = await created.text();

  expect(created.status, `não foi possível criar a rota: ${body}`).toBe(201);

  return JSON.parse(body).data;
}

test.describe("the Rotas board while a route is created elsewhere", () => {
  test("shows the new route without anybody touching the page", async ({
    page,
  }) => {
    await open(page, "/dashboard/routes");

    // The socket connects after the first paint; the room is joined by the
    // server at handshake for a user with a company of their own.
    await page.waitForTimeout(2_500);

    /**
     * A name nothing else on the page can be: the assertion below used to
     * look for the route's CODE, and a code is a small number that also
     * appears in a date, a total and a page control. Every mutation of the
     * realtime chain — no listener, no invalidation, a two-minute debounce,
     * the component not mounted at all — survived against it, because the
     * number was already on screen before anything happened.
     */
    const routeName = `Tempo real ${Date.now()}`;

    const route = await createRoute(
      await ownDelivery(),
      await anyVehicle(),
      routeName,
    );

    /*
      Creating a route emits nothing — it is a draft. RELEASING is the moment
      the operation changes, and it is the event the board has to hear.
    */
    // It must NOT be there yet — otherwise the assertion below proves only
    // that the board renders routes, which it always did.
    await expect(page.getByText(routeName, { exact: true })).toHaveCount(0);

    const released = await api(
      `/route/release-route/${route.id}/business/${CONTEXT.businessId}`,
      { method: "PATCH", body: JSON.stringify({ released: true }) },
    );

    expect(
      released.status,
      `não foi possível liberar a rota: ${await released.text()}`,
    ).toBe(200);

    // No reload, no click. The debounce is 1.2s plus a refetch.
    await expect(
      page.getByText(routeName, { exact: true }).first(),
      "a rota liberada não apareceu sozinha no quadro",
    ).toBeVisible({ timeout: 25_000 });
  });
});
