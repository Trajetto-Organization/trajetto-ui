import { test, expect, type Page } from "@playwright/test";

import {
  fixtureBusinessId,
  openAsMaster,
  ownOccurrence,
} from "./support/operation";

/**
 * Exporting Entregas and Ocorrências as the MASTER, in /admin (DLV-EXP-1,
 * TEST-EXP-1).
 *
 * The button called the export with (search, format) only and the action
 * never sent the company, so for the MASTER — who has no company of their
 * own — the API answered 400 "Empresa não identificada" and the screen showed
 * that toast instead of a file. The API E2E proves the query; this proves the
 * click, from the company picked in the selector to the file the browser
 * saves.
 */
async function exportAs(page: Page, format: "CSV" | "Excel") {
  const button = page.getByRole("button", { name: "Exportar" });

  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("menuitem", { name: format }).click(),
  ]);

  return download;
}

for (const tab of ["deliveries", "occurrences"] as const) {
  test.describe(`exports ${tab} as MASTER`, () => {
    test.beforeEach(async ({ page }) => {
      // Exportar is disabled on an empty list, and the seed files no
      // occurrence: make sure there is something to export.
      if (tab === "occurrences")
        await ownOccurrence(`Exportação E2E ${Date.now()}`);

      await openAsMaster(
        page,
        `/admin/deliveries?businessId=${fixtureBusinessId()}&tab=${tab}`,
      );
    });

    test("downloads the CSV of the picked company", async ({ page }) => {
      const download = await exportAs(page, "CSV");

      expect(download.suggestedFilename()).toMatch(/\.csv$/);
      await expect(page.getByText("Empresa não identificada")).toHaveCount(0);
    });

    test("downloads the Excel of the picked company", async ({ page }) => {
      const download = await exportAs(page, "Excel");

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      await expect(page.getByText("Empresa não identificada")).toHaveCount(0);
    });
  });
}
