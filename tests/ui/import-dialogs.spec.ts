import { test, expect, type Page } from "./support/test";

import { open } from "./support/operation";

/**
 * The two import dialogs in Entregas, side by side.
 *
 * They do the same thing — take a file and turn it into deliveries — and they
 * were not the same control. The XML one accepted a click anywhere inside the
 * drop area, answered the keyboard, lit up while a file was being dragged over
 * it and said "Solte os arquivos aqui". The spreadsheet one was an inert box
 * with an underlined word inside that had to be hit exactly: no hover, no
 * keyboard, and no sign that a drag was being noticed at all. One was 576px
 * wide with a split full-width footer, the other 672px with a right-aligned
 * one.
 *
 * None of that is visible from inside either dialog. It is visible when you
 * open one after the other, which is what a user does.
 */
async function openImport(
  page: Page,
  which: "Planilha" | "XML",
): Promise<void> {
  await open(page, "/dashboard/deliveries?tab=deliveries");

  await page.getByRole("button", { name: "Importar" }).click();

  await page
    .getByRole("menuitem", {
      name: which === "Planilha" ? /Planilha/ : /XML da NF-e/,
    })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
}

/** The measurements that say whether two drop zones are one control. */
interface ZoneShape {
  role: string | null;
  tabIndex: number;
  padding: string;
  borderStyle: string;
  borderWidth: string;
  radius: string;
  cursor: string;
  iconSize: string;
  dialogWidth: string;
}

async function shapeOf(page: Page): Promise<ZoneShape> {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;

    // The drop zone is the only element in these dialogs with a dashed
    // border; finding it that way keeps the test from depending on the
    // wording, which is the one thing that legitimately differs.
    const zone = [...dialog.querySelectorAll("*")].find((element) => {
      const style = getComputedStyle(element);

      return (
        style.borderTopStyle === "dashed" &&
        element.querySelector("svg") !== null
      );
    }) as HTMLElement;

    const style = getComputedStyle(zone);
    const icon = zone.querySelector("svg") as SVGElement;

    const iconStyle = getComputedStyle(icon);

    return {
      role: zone.getAttribute("role"),
      tabIndex: zone.tabIndex,
      padding: style.padding,
      borderStyle: style.borderTopStyle,
      borderWidth: style.borderTopWidth,
      radius: style.borderTopLeftRadius,
      cursor: style.cursor,
      iconSize: `${iconStyle.width}x${iconStyle.height}`,

      /**
       * The declared size, not the painted one.
       *
       * The rendered width differs by the eight pixels of a scroll bar that
       * one of them happens to need and the other does not — which is not a
       * design inconsistency. What WAS one is the ceiling: 576px against
       * 672px, two panels of visibly different size for the same act.
       */
      dialogWidth: getComputedStyle(dialog).maxWidth,
    };
  });
}

const zoneOf = (page: Page) =>
  page.locator('[role="dialog"] [role="button"][aria-label^="Arraste"]');

test.describe("the two Entregas imports", () => {
  for (const which of ["Planilha", "XML"] as const) {
    test(`${which}: the drop area is a real control`, async ({ page }) => {
      await openImport(page, which);

      const zone = zoneOf(page);

      await expect(
        zone,
        "a área de soltar arquivo não se anuncia como controle",
      ).toBeVisible();

      // Reachable by keyboard: the spreadsheet one used to be a div with an
      // underlined <button> inside that had to be hit exactly.
      await zone.focus();

      await expect(zone).toBeFocused();

      // And it looks clickable. A box that takes a click without saying so is
      // a box nobody clicks — which is why the spreadsheet one needed the
      // underlined word inside it in the first place.
      await expect(zone).toHaveCSS("cursor", "pointer");

      /**
       * And it notices a drag.
       *
       * Dispatched rather than performed: Playwright cannot drag a file in
       * from the desktop, and what is being checked is the handler, not the
       * operating system. `dataTransfer` is never read on enter.
       */
      await zone.dispatchEvent("dragenter");

      await expect(
        page.getByText(/^Solte/),
        "nada acontece quando um arquivo é arrastado para cima da área",
      ).toBeVisible();

      await zone.dispatchEvent("dragleave");

      await expect(page.getByText(/^Solte/)).toHaveCount(0);
    });

    test(`${which}: the footer follows the product pattern`, async ({
      page,
    }) => {
      await openImport(page, which);

      const dialog = page.getByRole("dialog");

      await expect(
        dialog.getByRole("button", { name: "Cancelar" }),
      ).toBeVisible();

      /**
       * Without a file, Importar is there and enabled (decision 16.701):
       * pressing it keeps the dialog open and says what is missing, under
       * the drop zone, instead of a grey button that explains nothing.
       */
      const submit = dialog.getByRole("button", { name: /^Importar/ });

      await expect(
        submit,
        "sem seleção o importar tem de estar presente e habilitado",
      ).toBeEnabled();

      await submit.click();

      await expect(
        dialog.getByText(
          which === "Planilha"
            ? "Escolha a planilha (.xlsx ou .csv)."
            : "Escolha ao menos um XML de NF-e.",
        ),
        "importar sem arquivo não disse o que falta",
      ).toBeVisible();

      await expect(dialog).toBeVisible();

      // "Voltar" promises a previous step, and there is none in either.
      await expect(dialog.getByRole("button", { name: /^Voltar/ })).toHaveCount(
        0,
      );
    });
  }

  test("and they are the SAME control in both", async ({ page }) => {
    /**
     * The assertion neither dialog can make about itself.
     *
     * Each could satisfy everything above and still look like a different
     * product — 8px icon here, 10px there, one box dashed at 1px and the
     * other at 2px, one dialog 100px narrower. A design system's promise is
     * that the same act looks the same.
     */
    await openImport(page, "Planilha");
    const spreadsheet = await shapeOf(page);

    await openImport(page, "XML");
    const xml = await shapeOf(page);

    expect(spreadsheet.role).toBe("button");
    expect(xml.role).toBe("button");

    expect(spreadsheet.tabIndex).toBe(0);
    expect(xml.tabIndex).toBe(0);

    expect(
      xml.padding,
      `padding da área: ${spreadsheet.padding} na planilha, ${xml.padding} no XML`,
    ).toBe(spreadsheet.padding);

    expect(xml.borderStyle).toBe(spreadsheet.borderStyle);
    expect(xml.borderWidth).toBe(spreadsheet.borderWidth);
    expect(xml.radius).toBe(spreadsheet.radius);

    expect(
      xml.cursor,
      "uma das áreas não parece clicável ao passar o mouse",
    ).toBe(spreadsheet.cursor);

    expect(
      xml.iconSize,
      `ícone: ${spreadsheet.iconSize} na planilha, ${xml.iconSize} no XML`,
    ).toBe(spreadsheet.iconSize);

    expect(
      xml.dialogWidth,
      `largura máxima do diálogo: ${spreadsheet.dialogWidth} na planilha, ${xml.dialogWidth} no XML`,
    ).toBe(spreadsheet.dialogWidth);
  });
});
