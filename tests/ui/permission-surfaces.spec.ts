import { test, expect, type Page } from "@playwright/test";

import {
  BASE,
  driverToken,
  managerToken,
} from "./support/operation";

/**
 * A page you may not open must not be offered to you either.
 *
 * The API has always refused: the principal — role, profile and every
 * permission on it — is read from the database on EVERY request, so a
 * permission removed a second ago is already gone from the next call. The
 * socket re-evaluates its rooms on a security event. Those are the two places
 * a leak would actually cost something, and both have their own tests.
 *
 * What none of them covers is the offer. A sidebar that lists Entregas to
 * somebody who cannot open it, or a ⌘K that jumps them to a page that answers
 * 403, is not a security hole — it is the product telling a lie about what
 * this person's job is, and it is the part a reviewer never checks because
 * every screen looks right when you are an administrator.
 *
 * Two sessions, the same build, the same three surfaces: the sidebar, the
 * command palette and the URL bar. Asserting only that the manager sees
 * everything would pass just as well with the permissions ignored entirely —
 * so every assertion here has a counterpart that must NOT be there.
 */
/*
  Long-lived sessions, not the load seed's. Those expire in an hour, and a
  suite that runs later signs in with a dead token: the app reads the 401 as
  "your session ended", redirects to /login, and this file — which exists to
  prove a driver cannot reach the office — fails saying the driver "caiu no
  login". A security assertion reporting a fixture's age.
*/
const MANAGER = managerToken();
const DRIVER = driverToken();

/**
 * Where a driver lands in the WEB app.
 *
 * `/driver/deliveries` does not exist here — the driver's delivery loop is the
 * phone, and the web keeps only the fleet paperwork. The first version of this
 * file navigated there anyway and every "must not be offered" assertion passed
 * against a not-found page with no navigation at all. That is the shape of a
 * test that proves nothing, and it is why the driver's own link is asserted
 * before any absence is.
 */
const DRIVER_HOME = "/driver/kanban";

/** Pages that belong to the dispatch office and to nobody else. */
const OFFICE_PAGES = [
  { name: "Entregas", path: "/dashboard/deliveries" },
  { name: "Rotas", path: "/dashboard/routes" },
  { name: "Torre de Controle", path: "/dashboard/control-tower" },
  { name: "Integrações", path: "/dashboard/integrations" },
];

async function openAs(
  page: Page,
  token: string,
  path: string,
): Promise<void> {
  await page.context().clearCookies();

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

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
}

/**
 * Everything the command palette is offering right now.
 *
 * The shortcut is pressed more than once on purpose. kbar binds its listener
 * during hydration, and against a dev server under three parallel workers the
 * page can be painted, answered and idle on the network while that listener is
 * still not there — so a single press lands in the gap and the palette never
 * opens. It failed about one run in six, which is the worst rate there is: too
 * rare to chase, often enough to teach people to re-run the suite.
 *
 * Pressing again is also what a person does when a shortcut does nothing, and
 * it cannot hide a real failure: the palette not opening after eight attempts
 * across sixteen seconds is the palette not opening.
 */
async function paletteEntries(page: Page): Promise<string[]> {
  const palette = page.locator('[role="dialog"], [role="listbox"]').first();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.keyboard.press("Control+k");

    try {
      await expect(palette).toBeVisible({ timeout: 2_000 });
      break;
    } catch {
      // Still hydrating. Press again.
    }
  }

  await expect(palette, "o ⌘K não abriu").toBeVisible({ timeout: 5_000 });

  // Whatever the palette renders as its options, by whatever role the library
  // gives them — read as text so this does not depend on kbar's internals.
  const text = await palette.innerText();

  await page.keyboard.press("Escape");

  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

test.describe("o escritório enxerga o escritório", () => {
  test("a gestora tem as páginas na sidebar e no ⌘K", async ({ page }) => {
    await openAs(page, MANAGER, "/dashboard");

    expect(page.url(), "a gestora caiu no login").not.toContain("/login");

    /**
     * Found at page level, by the link's own name.
     *
     * Scoping to a `navigation` landmark looked tidier and measured the wrong
     * thing: the shell has more than one, and `.first()` landed on the
     * breadcrumb — so the assertion failed for a manager who had every link
     * right there on screen.
     */
    for (const target of OFFICE_PAGES) {
      await expect(
        page.getByRole("link", { name: target.name, exact: true }).first(),
        `${target.name} não está na navegação da gestora`,
      ).toBeVisible({ timeout: 30_000 });
    }

    const entries = await paletteEntries(page);

    for (const target of OFFICE_PAGES) {
      expect(
        entries.some((entry) => entry.includes(target.name)),
        `${target.name} não está no ⌘K da gestora — oferecido: ${entries.join(" | ")}`,
      ).toBe(true);
    }
  });
});

test.describe("e o motorista não enxerga o escritório", () => {
  test("nenhuma das páginas aparece na sidebar", async ({ page }) => {
    await openAs(page, DRIVER, DRIVER_HOME);

    expect(page.url(), "o motorista caiu no login").not.toContain("/login");

    /**
     * The driver's own page first.
     *
     * Every assertion below is an absence, and absences pass beautifully on a
     * page that rendered nothing at all — the first version of this file
     * navigated to a route the web does not even have and "proved" the whole
     * thing against a not-found screen.
     *
     * The driver shell has no sidebar: a header with search, notifications and
     * the account menu, and the page under it. That is the point — there is no
     * list of office pages because there is no list.
     */
    await expect(
      page.getByRole("heading", { name: "Kanban", level: 2 }),
      "a tela do motorista não carregou",
    ).toBeVisible({ timeout: 30_000 });

    for (const target of OFFICE_PAGES) {
      await expect(
        page.getByRole("link", { name: target.name, exact: true }),
        `${target.name} está sendo oferecido a um motorista na sidebar`,
      ).toHaveCount(0);
    }
  });

  test("nem no ⌘K", async ({ page }) => {
    await openAs(page, DRIVER, DRIVER_HOME);

    const entries = await paletteEntries(page);

    // Same reason as above: an empty palette satisfies every absence below.
    expect(
      entries.length,
      "o ⌘K do motorista abriu vazio; o teste não mediu nada",
    ).toBeGreaterThan(2);

    /**
     * The palette filters its actions through `canAccessPath`, and that
     * function ALLOWS a path it does not know — which is how the control tower
     * and the integrations screen stayed ungated until they were registered.
     * So an entry appearing here is not a cosmetic slip; it is the same hole
     * wearing a different hat.
     */
    for (const target of OFFICE_PAGES) {
      expect(
        entries.some((entry) => entry.includes(target.name)),
        `${target.name} está sendo oferecido a um motorista no ⌘K — oferecido: ${entries.join(" | ")}`,
      ).toBe(false);
    }
  });

  test("e digitar a URL não abre a página", async ({ page }) => {
    // The offer is one thing; the door is another. A sidebar that hides the
    // link and a router that opens it anyway is worse than both.
    for (const target of OFFICE_PAGES) {
      await openAs(page, DRIVER, target.path);

      expect(
        page.url(),
        `um motorista abriu ${target.path} digitando a URL`,
      ).not.toContain(target.path);
    }
  });
});
