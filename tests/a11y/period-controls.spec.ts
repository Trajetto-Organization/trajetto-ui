import { readFileSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { managerForThisSpec } from "../ui/support/operation";
import { waitForHydration } from "../ui/support/ui";

/**
 * The period controls OPEN, under axe (decision of 28/10/2026).
 *
 * accessibility.spec.ts scans each screen as it loads, with every popover
 * closed — and the new controls are popovers: the range calendar of Entregas
 * and Pausas (it replaced native date inputs) and the Torre's "Atualizar a
 * cada" (it replaced a native select). A native control brings its own
 * semantics; these have to bring theirs, in both themes.
 */
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

async function open(
  page: Page,
  path: string,
  theme: "light" | "dark",
): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerForThisSpec(),
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.addInitScript((value) => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };

    try {
      window.localStorage.setItem("theme", value);
    } catch {
      // Blocked storage: the default theme still renders.
    }
  }, theme);

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
  await expect(page.locator("[data-error-surface]")).toHaveCount(0);
}

/** WCAG A/AA violations inside `scope`, as one line each. */
async function violationsIn(page: Page, scope: string): Promise<string[]> {
  await page.addScriptTag({ content: AXE });

  return page.evaluate(async (css) => {
    // @ts-expect-error injected above
    const report = await window.axe.run(
      { include: [[css]], exclude: [["nextjs-portal"]] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      },
    );

    return (report.violations as Array<Record<string, any>>).map(
      (rule) =>
        `${rule.impact} ${rule.id}: ${rule.help} — ${(
          rule.nodes as Array<Record<string, any>>
        )
          .slice(0, 3)
          .map((node) => String(node.target))
          .join(" ; ")}`,
    );
  }, scope);
}

test.describe.configure({ mode: "parallel" });

for (const theme of ["light", "dark"] as const) {
  test(`the range calendar of Entregas, open (${theme})`, async ({ page }) => {
    await open(page, "/dashboard/deliveries?period=7d", theme);

    const trigger = page.getByRole("button", { name: "Personalizado" });

    await waitForHydration(trigger);
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Período personalizado" });

    await expect(dialog.getByRole("grid")).toHaveCount(2, { timeout: 30_000 });

    expect(await violationsIn(page, '[role="dialog"]')).toEqual([]);

    // Escape closes it and gives the focus back to the trigger.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test(`the Torre's "Atualizar a cada", open (${theme})`, async ({ page }) => {
    await open(page, "/dashboard/control-tower?view=audit", theme);

    const trigger = page.locator("[data-tower-refresh-select]");

    await waitForHydration(trigger);

    // Named by the words beside it and its value.
    await expect(trigger).toHaveAccessibleName(/^Atualizar a cada \d min$/);

    await trigger.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("option")).toHaveCount(3);

    expect(await violationsIn(page, '[role="listbox"]')).toEqual([]);
    expect(
      await violationsIn(page, '[data-tutorial="control-tower-live"]'),
    ).toEqual([]);
  });
}
