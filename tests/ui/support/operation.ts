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
  /*
    The minted list first, and it is not a preference — it is a correctness
    fix. `load-context.json` is written by the LOAD seed, whose tokens live
    for an hour because that is the right lifetime for a load run. A browser
    suite that starts forty minutes later signs in with a dead token, the API
    answers 401, the app reads that as "your session ended" and redirects to
    /login, and every spec fails with a message about the product.
  */
  const managers: string[] =
    sessionsIfPresent()?.managers ?? CONTEXT.managerTokens;

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

/**
 * The back office's own session.
 *
 * `/admin` is MASTER-only and the load fixture seeds no MASTER — fifty
 * BUSINESS_ADMINs and twenty drivers, and nothing else. The consequence was
 * not a gap in coverage, it was the ABSENCE of coverage: every browser test
 * in this repository navigates to /login, /dashboard or /driver, and not one
 * of them had ever opened an /admin screen. Two render-fatal bugs lived there
 * through a full manual pass, a typecheck and 53 UI tests, because nothing
 * automated could reach them.
 *
 * Minted by `trajetto-api/tests/load/mint-master.ts`, which creates the row in
 * the throwaway `load_test` database and signs a long-lived token. Nobody's
 * password is touched.
 */
interface Sessions {
  master: string;
  manager: string;
  managers: string[];
  drivers: string[];
  businessId: string;
}

const SESSIONS_PATH =
  "../trajetto-api/tests/load/fixtures/browser-sessions.json";

/** The minted sessions, or nothing when they have not been minted yet. */
function sessionsIfPresent(): Sessions | null {
  try {
    return JSON.parse(readFileSync(SESSIONS_PATH, "utf8")) as Sessions;
  } catch {
    return null;
  }
}

function sessions(): Sessions {
  const found = sessionsIfPresent();

  if (found) return found;

  throw new Error(
    `${SESSIONS_PATH} nao existe. Rode, no trajetto-api:` +
      String.fromCharCode(10) +
      '  DATABASE_URL="...load_test..." npx tsx tests/load/mint-master.ts',
  );
}

/**
 * Signs in as a MASTER and lands on a back-office screen.
 *
 * `domcontentloaded` rather than `networkidle`, which is what `open` uses for
 * /dashboard. The back office keeps a socket open and several panels poll, so
 * the network never goes idle and the wait expires on a page that has been
 * ready for fifty seconds — a timeout that reads like a broken screen and is
 * nothing of the kind. The caller waits for the thing it actually needs.
 */
async function openAsMaster(page: Page, path: string): Promise<void> {
  await signIn(page, sessions().master);

  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  // The shell is what says the session was accepted and the layout mounted.
  await expect(page.locator("main").first()).toBeVisible({ timeout: 60_000 });

  expect(page.url(), `caiu no login: ${path}`).not.toContain("/login");

  /**
   * A screen that crashed is not a screen that passed.
   *
   * The error surface renders a heading, a button and a correct layout, so it
   * satisfies almost anything a test asks of "the page". Two render-fatal
   * bugs in /admin were green in the accessibility and responsive suites for
   * exactly that reason. One assertion, in every place a test arrives at a
   * URL, closes it.
   */
  await expect(
    page.locator("[data-error-surface]"),
    `a tela caiu no limite de erro: ${path}`,
  ).toHaveCount(0);
}

/** The company the fixture's operation belongs to, for the admin selector. */
const fixtureBusinessId = (): string => sessions().businessId;

/**
 * A long-lived session of each kind, for the specs that need a SPECIFIC role
 * rather than "a manager of this file's own".
 *
 * Same reason as `managerForThisSpec`: the load seed's tokens live an hour,
 * and a browser suite that starts later signs in with a dead one. The app
 * reads the resulting 401 as "your session ended" and redirects to /login, so
 * a spec proving that a driver cannot see the office fails claiming the
 * driver "caiu no login" — a security assertion reporting a fixture's age.
 */
const managerToken = (): string =>
  sessionsIfPresent()?.managers?.[0] ?? (CONTEXT.managerTokens[0] as string);

const driverToken = (): string =>
  sessionsIfPresent()?.drivers?.[0] ?? (CONTEXT.driverTokens[0] as string);

async function signIn(page: Page, token: string): Promise<void> {
  await page.context().addCookies([
    { name: "tkey", value: token, domain: "localhost", path: "/" },
  ]);

  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
}

/**
 * Signs in as the fixture's manager and lands on a screen.
 *
 * `expectBroken` exists for exactly one caller: the spec that drives the
 * boundary probe on purpose. Everywhere else, arriving at the error surface
 * is a failure, and the assertion below is what makes it one.
 */
async function open(
  page: Page,
  path: string,
  options: { expectBroken?: boolean } = {},
): Promise<void> {
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

  /**
   * A screen that crashed is not a screen that passed.
   *
   * The error surface renders a heading, a button and a correct layout, so it
   * satisfies almost anything a test asks of "the page". Two render-fatal
   * bugs in /admin were green in the accessibility and responsive suites for
   * exactly that reason. One assertion, in every place a test arrives at a
   * URL, closes it.
   */
  if (!options.expectBroken) {
    await expect(
      page.locator("[data-error-surface]"),
      `a tela caiu no limite de erro: ${path}`,
    ).toHaveCount(0);
  }
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
  driverToken,
  fixtureBusinessId,
  managerToken,
  ndjson,
  open,
  openAsMaster,
  ownDelivery,
};
