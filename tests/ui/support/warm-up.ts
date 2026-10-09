import { chromium, type Browser } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * Compiles every route the suite visits before the first test starts.
 *
 * next dev compiles a route on its first request. With three workers the
 * first tests landed on routes that were still compiling, and the client
 * chunk served mid-compilation threw "SyntaxError: Invalid or unexpected
 * token" — the page never hydrated and the first spec failed about the login
 * form. Post-hydration waits elsewhere (the api-keys card, the operation
 * panel) timed out for the same reason: the compile, not the product.
 *
 * One route at a time, serially, so the compiler is not the thing under load.
 * Keeping the compiled routes alive afterwards is next.config's
 * NEXT_DEV_KEEP_PAGES (README, step 3). Best effort: a route that fails here
 * is reported and left to its spec, which says what is wrong with it.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const SESSIONS = "../trajetto-api/tests/load/fixtures/browser-sessions.json";
const CONTEXT = "../trajetto-api/tests/load/fixtures/load-context.json";

const PUBLIC = ["/login", "/docs", "/docs/assinatura"];

const MANAGER = [
  "/dashboard",
  "/dashboard/deliveries",
  "/dashboard/routes",
  "/dashboard/control-tower",
  "/dashboard/integrations",
  "/dashboard/vehicle",
  "/dashboard/vehicle-checklist",
  "/dashboard/fuel",
  "/dashboard/service-order",
  "/dashboard/account-payable",
  "/dashboard/driver",
  "/dashboard/driver-pauses",
  "/dashboard/branch",
  "/dashboard/supplier",
  "/dashboard/fine",
  "/dashboard/kanban",
  "/dashboard/activity",
  "/dashboard/boundary-probe",
  "/notifications",
  "/profile",
];

const MASTER = [
  "/admin",
  "/admin/business",
  "/admin/user-registration",
  "/admin/master-users",
  "/admin/profile-access",
  "/admin/deliveries",
  "/admin/routes",
  "/admin/control-tower",
  "/admin/integrations",
  "/admin/vehicle",
  "/admin/driver",
  "/admin/branch",
  "/admin/activity",
];

const DRIVER = [
  "/driver",
  "/driver/vehicles",
  "/driver/kanban",
  "/driver/account-payable",
];

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

async function visit(
  browser: Browser,
  token: string | null,
  paths: string[],
): Promise<string[]> {
  const context = await browser.newContext();
  const failed: string[] = [];

  if (token) {
    await context.addCookies([
      { name: "tkey", value: token, domain: "localhost", path: "/" },
    ]);
  }

  // The guided tour would open over every screen; it is not being compiled.
  await context.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      return key.startsWith("tutorial_") ? "true" : real.call(this, key);
    };
  });

  const page = await context.newPage();

  for (const path of paths) {
    try {
      // "load" means every chunk the route asked for was served (and so
      // compiled); networkidle never comes on screens with a socket.
      await page.goto(`${BASE}${path}`, {
        waitUntil: "load",
        timeout: 180_000,
      });
    } catch (error) {
      failed.push(`${path}: ${(error as Error).message.split("\n")[0]}`);
    }
  }

  await context.close();

  return failed;
}

export default async function warmUp(): Promise<void> {
  if (process.env.UI_SKIP_WARM_UP === "1") return;

  const sessions = readJson(SESSIONS) as {
    master?: string;
    managers?: string[];
    drivers?: string[];
  } | null;
  const context = readJson(CONTEXT) as { managerTokens?: string[] } | null;

  const manager =
    sessions?.managers?.[0] ?? context?.managerTokens?.[0] ?? null;

  const started = Date.now();
  const browser = await chromium.launch();

  try {
    const failed = [
      ...(await visit(browser, null, PUBLIC)),
      ...(manager ? await visit(browser, manager, MANAGER) : []),
      ...(sessions?.master
        ? await visit(browser, sessions.master, MASTER)
        : []),
      ...(sessions?.drivers?.[0]
        ? await visit(browser, sessions.drivers[0], DRIVER)
        : []),
    ];

    for (const line of failed) console.warn(`[warm-up] ${line}`);

    console.log(
      `[warm-up] rotas compiladas em ${Math.round((Date.now() - started) / 1000)} s`,
    );
  } finally {
    await browser.close();
  }
}
