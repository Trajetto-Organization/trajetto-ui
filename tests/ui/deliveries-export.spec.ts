import { test, expect, type Page } from "./support/test";

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
 *
 * Ocorrências is a view of the Torre de controle since the product meeting
 * of 14/10/2026 (`?view=occurrences`), with the same table and the same
 * Exportar; the company travels in the Torre's URL the same way.
 */
const SECTIONS = [
  {
    name: "deliveries",
    path: () =>
      `/admin/deliveries?businessId=${fixtureBusinessId()}&tab=deliveries`,
  },
  {
    name: "occurrences",
    path: () =>
      `/admin/control-tower?businessId=${fixtureBusinessId()}&view=occurrences`,
  },
] as const;

/*
  One file at a time: the API runs one export per company at a time and
  answers the second 429 EXPORT_BUSY (export-slots.ts), and every test here
  exports the same company. In parallel, the CSV and the Excel landed in the
  same second and one download never came (seen locally on Prisma 6 and 7,
  with the API logging EXPORT_BUSY; run with --workers=1 the file passes 4/4).
*/
test.describe.configure({ mode: "serial" });

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

for (const section of SECTIONS) {
  test.describe(`exports ${section.name} as MASTER`, () => {
    test.beforeEach(async ({ page }) => {
      // Exportar is disabled on an empty list, and the seed files no
      // occurrence: make sure there is something to export.
      if (section.name === "occurrences")
        await ownOccurrence(`Exportação E2E ${Date.now()}`);

      await openAsMaster(page, section.path());
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
