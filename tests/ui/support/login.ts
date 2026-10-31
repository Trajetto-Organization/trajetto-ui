import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { nextClientAddress, prepareContext } from "./hermetic";
import { waitForHydration } from "./ui";

/**
 * Signing in the way a person does: through the form.
 *
 * Every other spec in this folder drops a minted JWT in the `tkey` cookie.
 * That is right for a question about a screen and says nothing about getting
 * in — the form, the server action, the cookies it sets, where each role
 * lands. These accounts have real passwords; they are created by
 * `trajetto-api/tests/load/mint-browser-users.ts` in the throwaway database.
 *
 * The captcha on the form is Cloudflare's script answered by a local double
 * (support/external-doubles.ts) and, in CI, a local siteverify
 * (tests/ui/support/turnstile-siteverify-double.mjs): a login never waits
 * on Cloudflare.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const API = process.env.LOAD_BASE_URL ?? "http://localhost:3334";

/** The documented test password of the throwaway accounts (never a real one). */
const PASSWORD = process.env.WEB_E2E_PASSWORD ?? "Navegador@E2E2026";

const USERS_PATH = "../trajetto-api/tests/load/fixtures/browser-users.json";

interface Account {
  id: string;
  email: string;
  driverId?: string;
}

interface BrowserUsers {
  companies: Record<
    "full" | "fleetOnly" | "deliveriesOnly",
    { id: string; cnpj: string; label: string; modules: string[] }
  >;
  users: Record<
    | "master"
    | "admin"
    | "secondAdmin"
    | "fullUser"
    | "readOnlyUser"
    | "twoFactor"
    | "driver"
    | "fleetOnlyAdmin"
    | "deliveriesOnlyAdmin",
    Account
  >;
  full: {
    shipperId: string;
    vehicleId: string;
    driverId: string;
    routeId: string;
    fuelTypeId: string;
  };
}

type Who = keyof BrowserUsers["users"];

function browserUsers(): BrowserUsers {
  try {
    return JSON.parse(readFileSync(USERS_PATH, "utf8")) as BrowserUsers;
  } catch {
    throw new Error(
      `${USERS_PATH} não existe. Rode, no trajetto-api:\n` +
        '  DATABASE_URL="...load_test..." npx tsx tests/load/mint-browser-users.ts',
    );
  }
}

/**
 * The API's per-address login limit answering.
 *
 * Each browser context of the suites is a person with an address of its own
 * (support/hermetic.ts), and each API login below sends one too, so no test
 * shares a bucket with another and the limit never answers in a healthy run.
 * When it does, the forwarding is not set up — the web or the API without
 * the same RATE_LIMIT_FORWARDER_SECRET — and every login of the run is back
 * in one shared bucket. That is said at once, by name. Waiting the window
 * out (what this helper used to do, 61 s at a time) made a test's duration
 * depend on the other worker and hid the misconfiguration.
 */
const RATE_LIMITED = /Limite de requisições excedido|Muitas tentativas/i;

const SHARED_BUCKET =
  "a API limitou o login por endereço. Nas suítes cada contexto do navegador " +
  "é uma pessoa com o próprio endereço, e isso só funciona com o MESMO " +
  "RATE_LIMIT_FORWARDER_SECRET na API, na web e no processo do Playwright " +
  "(tests/ui/README.md, passo 3)";

async function submitLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });

  // Typed into the server HTML, a click on "Entrar" before React owns the
  // form posts it without the client side (Turnstile token, checks), and
  // the outcome is about timing, not about the login.
  await waitForHydration(page.getByLabel("Email"));

  // The captcha loads on a person's first input (person-input.ts), and
  // fill() makes none: the click on the field does, as a person's would.
  await page.getByLabel("Email").click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  // Either the page leaves /login, or the form says something.
  const outcome = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.startsWith("/login"), {
        timeout: 60_000,
      })
      .then(() => "left" as const),
    page
      .getByRole("heading", { name: "Autenticação (2FA)" })
      .waitFor({ timeout: 60_000 })
      .then(() => "two-factor" as const),
    page
      .getByText(RATE_LIMITED)
      .waitFor({ timeout: 60_000 })
      .then(() => "limited" as const),
    page
      .getByText("Credenciais inválidas!")
      .waitFor({ timeout: 60_000 })
      .then(() => "refused" as const),
  ]).catch(() => "timeout" as const);

  if (outcome === "limited") throw new Error(`${SHARED_BUCKET} (${email})`);
}

/** Signs in through the form and waits until the page has left /login. */
async function loginThroughForm(page: Page, who: Who): Promise<void> {
  const account = browserUsers().users[who];

  await submitLogin(page, account.email, PASSWORD);

  await expect(page, `${who} não saiu do /login`).not.toHaveURL(/\/login/, {
    timeout: 60_000,
  });
}

/** A fresh context (its own cookie jar) signed in as `who` (a fixture account or an e-mail). */
async function signedInContext(
  browser: Browser,
  who: Who | { email: string },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Already done when `browser` is the suites' fixture (support/test.ts);
  // explicit so a person's own address never depends on who passed it.
  await prepareContext(context);

  // The tours would cover what the specs click; tutorial-tours.spec.ts owns them.
  await context.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  const page = await context.newPage();

  if (typeof who === "string") {
    await loginThroughForm(page, who);
  } else {
    await submitLogin(page, who.email, PASSWORD);
    await expect(page, `${who.email} não saiu do /login`).not.toHaveURL(
      /\/login/,
      {
        timeout: 60_000,
      },
    );
  }

  return { context, page };
}

/** The access token the form login left in this context, for API set-up calls. */
async function accessTokenOf(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === "tkey",
  );

  if (!cookie) throw new Error("O contexto não tem o cookie de sessão tkey.");

  return cookie.value;
}

/**
 * Runs one of the API repository's mint scripts. They write to the
 * throwaway database directly, so the Playwright process must carry its
 * DATABASE_URL (tests/ui/README.md); without it the script refused deep
 * inside a spec with a message that did not say what was missing.
 */
function runMintScript(script: string, args: string[]): void {
  if (!process.env.DATABASE_URL?.includes(":54321/")) {
    throw new Error(
      `${script} precisa do DATABASE_URL do banco descartável (porta 54321) no processo do Playwright. ` +
        "Exporte-o antes de rodar a suíte (veja tests/ui/README.md).",
    );
  }

  execFileSync("npx", ["tsx", `tests/load/${script}`, ...args], {
    cwd: resolve("../trajetto-api"),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "pipe",
  });
}

/**
 * Swaps the pending two-factor code of `email` for `code`, through the API
 * repository's script (the stored value is a keyed hash, so only the API's
 * own function can write a code it will accept).
 */
function setTwoFactorCode(email: string, code: string): void {
  runMintScript("mint-two-factor-code.ts", [email, code]);
}

/**
 * Sets the suite's password on an account a journey just created (the API
 * e-mailed it a generated one), through the API repository's script.
 */
function setKnownPassword(email: string): void {
  runMintScript("mint-password.ts", [email]);
}

/** A call to the API with a session's token, the way another client would. */
async function apiAs(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
}

/** NDJSON listings: the first line is the meta, the rest are rows. */
function ndjsonRows(body: string): Record<string, unknown>[] {
  return body
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .slice(1);
}

/**
 * The headers that make an API call count as a person of its own, the way
 * the web's server relays a browser's address (src/lib/api-forwarding.ts).
 * Every call from this process leaves from the same loopback; a phone in
 * the field would have its own address.
 */
function asSeparatePerson(): Record<string, string> {
  const secret = process.env.RATE_LIMIT_FORWARDER_SECRET;

  return secret
    ? {
        "x-trajetto-client-ip": nextClientAddress(),
        "x-trajetto-forwarder-secret": secret,
      }
    : {};
}

/** Signs in through the API's login route (the phone app's path), no browser. */
async function apiLogin(email: string): Promise<string> {
  const response = await fetch(`${API}/user/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...asSeparatePerson() },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  // Same per-address limit as the form (see RATE_LIMITED above).
  if (response.status === 429) {
    throw new Error(`${SHARED_BUCKET} (login de ${email} pela API)`);
  }

  const body = (await response.json()) as { token?: string; message?: string };

  expect(
    response.status,
    `login de ${email} pela API: ${body.message ?? ""}`,
  ).toBe(200);
  expect(body.token).toBeTruthy();

  return body.token as string;
}

/**
 * A driver of this spec's own in the fixture's full company: a driver record,
 * a truck linked to it and a login with the suite's password.
 *
 * Specs that start routes cannot share the fixture's driver: a driver holds
 * one route in progress at a time, and two specs running at once — or a
 * previous run that left a route open — answer ROUTE_DRIVER_BUSY about the
 * fixture, not the product.
 */
async function ownDriver(
  adminToken: string,
  label: string,
): Promise<{
  driverId: string;
  vehicleId: string;
  email: string;
  name: string;
}> {
  const users = browserUsers();
  const businessId = users.companies.full.id;
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const name = `Motorista ${label} ${stamp.slice(-6)}`;
  const email = `motorista.${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${stamp}@trajetto.test`;

  const ok = async (response: Response, what: string) => {
    const body = await response.text();

    expect([200, 201], `${what}: ${body.slice(0, 300)}`).toContain(
      response.status,
    );
  };

  const digits = (count: number) =>
    Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join(
      "",
    );

  const cpf = (() => {
    const base = Array.from({ length: 9 }, () =>
      Math.floor(Math.random() * 10),
    );
    const check = (numbers: number[]) => {
      const sum = numbers.reduce(
        (total, value, index) => total + value * (numbers.length + 1 - index),
        0,
      );
      const rest = (sum * 10) % 11;

      return rest === 10 ? 0 : rest;
    };
    const first = check(base);

    return [...base, first, check([...base, first])].join("");
  })();

  const renavam = (() => {
    const base = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10),
    );
    const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const rest =
      (base.reduce((total, value, index) => total + value * weights[index], 0) *
        10) %
      11;

    return [...base, rest === 10 ? 0 : rest].join("");
  })();

  await ok(
    await apiAs(adminToken, `/driver/create-driver/${businessId}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        birth_date: "1990-05-10",
        cnh: digits(11),
        cpf,
        rg: digits(9),
        cep: "01001000",
        city: "São Paulo",
        uf: "SP",
        street: "Praça da Sé",
        address_number: "1",
        status: "ACTIVE",
        contract_type: "OWNED",
      }),
    }),
    "motorista",
  );

  const driverId = ndjsonRows(
    await (
      await apiAs(
        adminToken,
        `/driver/search-driver-business?businessId=${businessId}&search=${encodeURIComponent(name)}`,
      )
    ).text(),
  )[0]?.id as string;

  expect(driverId, "o motorista criado não foi encontrado").toBeTruthy();

  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const plate = `${letter()}${letter()}${letter()}${digits(1)}${letter()}${digits(2)}`;

  await ok(
    await apiAs(adminToken, `/vehicle/create-vehicle/${businessId}`, {
      method: "POST",
      body: JSON.stringify({
        description: `Caminhão ${label}`,
        license_plate: plate,
        brand: "Volvo",
        model: "VM 270",
        acquisition_date: "2022-01-10",
        fleet_type: "OWNED",
        current_mileage: 1000,
        maintenance_interval_km: 10000,
        maintenance_interval_months: 6,
        renavam,
        manufacturing_year: "2021-01-01",
        model_year: "2022-01-01",
        km_per_liter: 3,
        number_of_axles: 2,
        status: "ACTIVE",
        fuelTypeId: users.full.fuelTypeId,
        driverId,
      }),
    }),
    "veículo",
  );

  const vehicleId = ndjsonRows(
    await (
      await apiAs(
        adminToken,
        `/vehicle/search-vehicle-business?businessId=${businessId}&search=${plate}`,
      )
    ).text(),
  )[0]?.id as string;

  await ok(
    await apiAs(adminToken, `/user/create-user`, {
      method: "POST",
      body: JSON.stringify({
        email,
        name,
        role: "BUSINESS_USER",
        businessId,
        driverId,
        userType: "driver",
      }),
    }),
    "login do motorista",
  );

  setKnownPassword(email);

  return { driverId, vehicleId, email, name };
}

export {
  API,
  BASE,
  PASSWORD,
  accessTokenOf,
  apiAs,
  apiLogin,
  browserUsers,
  ndjsonRows,
  ownDriver,
  setKnownPassword,
  loginThroughForm,
  setTwoFactorCode,
  signedInContext,
  submitLogin,
};
export type { BrowserUsers, Who };
