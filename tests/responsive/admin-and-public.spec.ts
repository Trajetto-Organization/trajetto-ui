import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

import { gotoSettled } from "../ui/support/network";

/**
 * The back office and the public site from 320px to 1920px (decision 13.3).
 *
 * `responsive.spec.ts` measures the manager's screens at eleven widths. /admin
 * (MASTER only) and the pages a visitor sees before signing in were never
 * measured at all. The question is the same one, the one a phone answers
 * first: does the page scroll sideways?
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const SESSIONS = JSON.parse(
  readFileSync(
    "../trajetto-api/tests/load/fixtures/browser-sessions.json",
    "utf8",
  ),
) as { master: string; businessId: string };

const WIDTHS = [320, 390, 768, 1024, 1440, 1920];

const PAGES = [
  { path: "/admin", name: "admin", master: true },
  { path: "/admin/business", name: "admin companies", master: true },
  {
    path: `/admin/deliveries?businessId=${SESSIONS.businessId}`,
    name: "admin deliveries",
    master: true,
  },
  {
    path: `/admin/routes?businessId=${SESSIONS.businessId}`,
    name: "admin routes",
    master: true,
  },
  {
    path: `/admin/user-registration?businessId=${SESSIONS.businessId}`,
    name: "admin users",
    master: true,
  },
  { path: "/", name: "home", master: false },
  { path: "/gestao-de-entregas", name: "delivery management", master: false },
  { path: "/gestao-de-frotas", name: "fleet management", master: false },
  { path: "/sobre", name: "about", master: false },
  { path: "/contato", name: "contact", master: false },
  { path: "/orcamento", name: "quote", master: false },
  { path: "/login", name: "login", master: false },
  { path: "/docs", name: "docs", master: false },
  { path: "/legal/privacidade", name: "privacy", master: false },
  { path: "/blog", name: "blog", master: false },
];

/** How far the page scrolls sideways. Zero is the only acceptable answer. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;

    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

test.describe.configure({ mode: "parallel" });

for (const target of PAGES) {
  test.describe(target.name, () => {
    for (const width of WIDTHS) {
      test(`does not scroll sideways at ${width}px`, async ({ page }) => {
        if (target.master) {
          await page.context().addCookies([
            {
              name: "tkey",
              value: SESSIONS.master,
              domain: "localhost",
              path: "/",
            },
          ]);
        }

        // The tours are measured by tutorial-tours.spec.ts.
        await page.addInitScript(() => {
          const real = Storage.prototype.getItem;

          Storage.prototype.getItem = function getItem(key: string) {
            if (key.startsWith("tutorial_")) return "true";

            return real.call(this, key);
          };
        });

        await page.setViewportSize({ width, height: 900 });

        // "networkidle" minus the captcha's never-ending request on /login
        // (support/network): with it the page never went idle.
        const response = await gotoSettled(page, `${BASE}${target.path}`, {
          timeout: 90_000,
        });

        expect(response?.status()).toBe(200);

        if (target.master) {
          expect(
            page.url(),
            `${target.name} @ ${width}px caiu no login`,
          ).not.toContain("/login");
        }

        await expect(
          page.locator("[data-error-surface]"),
          `${target.name} @ ${width}px caiu no limite de erro`,
        ).toHaveCount(0);

        expect(
          await horizontalOverflow(page),
          `${target.name} @ ${width}px rola para o lado`,
        ).toBeLessThanOrEqual(2);
      });
    }
  });
}
