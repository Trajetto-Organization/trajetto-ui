import { createElement } from "react";

import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { FuelInfoAlert } from "@/app/(protected)/_components/shared/fuel-details-dialog/fuel-info-alert";

/**
 * The fueling summary inside the detail dialog ("Resumo do Abastecimento").
 *
 * The dialog's own badge learned the pump's three decimals (Decimal(10,3)),
 * but the summary under it kept the money format: 5.899 read "Preço/L:
 * R$ 5,90", one line above a total computed from 5.899. It reads as a price
 * per litre now, while the total stays money.
 */
const text = (html: string) => html.replace(/<!-- -->/g, "").replace(/ /g, " ");

describe("the fueling summary", () => {
  it("shows the price per litre with the pump's three decimals and its unit", () => {
    const html = text(
      renderHtml(
        createElement(FuelInfoAlert, { liters: 40, pricePerLiter: 5.899 }),
      ),
    );

    expect(html).toContain("Preço: R$ 5,899/L");
    expect(html).not.toContain("R$ 5,90<");
  });

  it("keeps the total as money", () => {
    const html = text(
      renderHtml(
        createElement(FuelInfoAlert, { liters: 40, pricePerLiter: 5.899 }),
      ),
    );

    expect(html).toContain("Total: R$ 235,96");
  });
});
