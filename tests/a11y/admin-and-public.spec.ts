import { test, expect, type Page } from "../ui/support/test";

import { readFileSync } from "node:fs";

import { gotoSettled } from "../ui/support/network";

/**
 * The back office and the public site against WCAG (decision 13.3).
 *
 * `accessibility.spec.ts` measures the manager's screens. Two families were
 * never scanned: /admin, which only a MASTER opens, and the pages a visitor
 * sees before having an account — the home, the product pages, the login,
 * the developer guides, the legal texts, the blog. The same axe rule set
 * (WCAG 2.0/2.1 A and AA), both themes, a phone and a desktop.
 */
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const SESSIONS = JSON.parse(
  readFileSync(
    "../trajetto-api/tests/load/fixtures/browser-sessions.json",
    "utf8",
  ),
) as { master: string; businessId: string };

const ADMIN_PAGES = [
  { path: "/admin", name: "admin" },
  { path: "/admin/business", name: "admin companies" },
  {
    path: `/admin/deliveries?businessId=${SESSIONS.businessId}`,
    name: "admin deliveries",
  },
  {
    path: `/admin/routes?businessId=${SESSIONS.businessId}`,
    name: "admin routes",
  },
  {
    path: `/admin/user-registration?businessId=${SESSIONS.businessId}`,
    name: "admin users",
  },
];

const PUBLIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/gestao-de-entregas", name: "delivery management" },
  { path: "/gestao-de-frotas", name: "fleet management" },
  { path: "/sobre", name: "about" },
  { path: "/contato", name: "contact" },
  { path: "/orcamento", name: "quote" },
  { path: "/login", name: "login" },
  { path: "/forgot", name: "forgot password" },
  { path: "/docs", name: "docs" },
  { path: "/legal/privacidade", name: "privacy" },
  { path: "/blog", name: "blog" },
];

const WIDTHS = [390, 1440] as const;
const THEMES = ["light", "dark"] as const;

async function open(
  page: Page,
  path: string,
  width: number,
  theme: "light" | "dark",
  asMaster: boolean,
): Promise<void> {
  if (asMaster) {
    await page.context().addCookies([
      {
        name: "tkey",
        value: SESSIONS.master,
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      // Blocked storage: the default theme still renders.
    }
  }, theme);

  await page.setViewportSize({ width, height: 900 });

  // "networkidle" minus the captcha's never-ending request (support/network).
  const response = await gotoSettled(page, `${BASE}${path}`, {
    timeout: 90_000,
  });

  expect(response?.status(), `${path} não respondeu 200`).toBe(200);

  if (asMaster) {
    expect(page.url(), `caiu no login: ${path}`).not.toContain("/login");
  }

  await expect(
    page.locator("[data-error-surface]"),
    `a tela caiu no limite de erro: ${path}`,
  ).toHaveCount(0);
}

/**
 * Lets the page's finite animations end before measuring.
 *
 * The public pages fade content in as it scrolls into view (`.reveal`, 600ms
 * from opacity 0). axe read a heading mid-fade and reported its contrast at
 * whatever opacity that frame had — a different verdict on every run for
 * text that ends fully opaque. Infinite animations (a pulsing dot) are left
 * alone; they never finish.
 */
async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          // Running and finite only: a paused animation (a reveal waiting for
          // its element to scroll in) never finishes, and /about has those.
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
      // The fades are 600 ms; anything still moving after this is not one.
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]),
  );
}

async function axeViolations(page: Page): Promise<string[]> {
  await settleAnimations(page);
  await page.addScriptTag({ content: AXE });

  const violations = await page.evaluate(async () => {
    // @ts-expect-error injected above
    const report = await window.axe.run(
      // The dev server's own overlay is not the product (see accessibility.spec).
      { exclude: [["nextjs-portal"]] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      },
    );

    return (report.violations as Array<Record<string, any>>).map((rule) => ({
      id: rule.id as string,
      impact: rule.impact as string,
      help: rule.help as string,
      nodes: (rule.nodes as Array<Record<string, any>>)
        .slice(0, 3)
        .map((node) => String(node.target)),
    }));
  });

  return violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} — ${v.nodes.join(" ; ")}`,
  );
}

test.describe.configure({ mode: "parallel" });

for (const [family, pages, asMaster] of [
  ["back office", ADMIN_PAGES, true],
  ["public site", PUBLIC_PAGES, false],
] as const) {
  test.describe(`axe — ${family}`, () => {
    for (const target of pages) {
      for (const width of WIDTHS) {
        for (const theme of THEMES) {
          test(`${target.name} @ ${width}px (${theme})`, async ({ page }) => {
            // The tours would add their own dialog to every scan; the tour
            // dialog has its own spec (tutorial-dialog.spec.ts).
            await page.addInitScript(() => {
              const real = Storage.prototype.getItem;

              Storage.prototype.getItem = function getItem(key: string) {
                if (key.startsWith("tutorial_")) return "true";

                return real.call(this, key);
              };
            });

            await open(page, target.path, width, theme, asMaster);

            // Polled: "networkidle" is not hydration. A wide table's scroller
            // gets its tab stop from a client measurement, so axe reading the
            // server HTML of a slow-to-hydrate /admin reported
            // scrollable-region-focusable for a box the hydrated page makes
            // focusable. A violation still there after 20 s is real.
            await expect
              .poll(() => axeViolations(page), { timeout: 20_000 })
              .toEqual([]);
          });
        }
      }
    }
  });
}
