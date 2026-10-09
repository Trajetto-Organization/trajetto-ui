import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The dialogs reach server actions; what is proven here is the menu.
vi.mock("@/app/(protected)/_components/admin/quote/view-quote-modal", () => ({
  ViewQuoteModal: () => null,
}));
vi.mock(
  "@/app/(protected)/_components/admin/quote/update-quote-status-modal",
  () => ({
    UpdateQuoteStatusModal: () => null,
  }),
);
vi.mock("@/app/(protected)/_components/admin/quote/delete-quote-modal", () => ({
  DeleteQuoteModal: () => null,
}));

import { DataTableQuoteRowActions } from "@/app/(protected)/_components/admin/quote/data-table-row-actions";
import { quoteStatusBlockedReason } from "@/app/(protected)/_components/admin/quote/lib/row-actions";
import type { QuoteStatus } from "@/app/(protected)/_components/admin/quote/quote.types";

/**
 * The quote row menu on the product's standard (decision 3.5): 160px, text
 * only, "Excluir" as the destructive act, and "Atualizar status" disabled
 * with the reason on a finished quote — the API refuses that change too.
 */
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function openMenu(status: QuoteStatus): Promise<HTMLElement[]> {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const row = {
    original: {
      id: "q-1",
      name: "Ana",
      company: "Transportes Alfa",
      email: "ana@alfa.com.br",
      telephone: "11999999999",
      fleet_size: "1-10",
      status,
      created_at: "2026-09-01T12:00:00.000Z",
      updated_at: "2026-09-01T12:00:00.000Z",
    },
  };

  await act(async () => {
    root = createRoot(container);
    root.render(createElement(DataTableQuoteRowActions, { row } as never));
  });

  const trigger = container.querySelector("button") as HTMLButtonElement;

  await act(async () => {
    trigger.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        ctrlKey: false,
      }),
    );
  });

  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
}

describe("the quote row menu", () => {
  it("is the standard menu: 160px, text only, 'Excluir' in red", async () => {
    const items = await openMenu("PENDING");

    expect(items.map((item) => item.textContent)).toEqual([
      "Ver detalhes",
      "Atualizar status",
      "Copiar ID",
      "Copiar e-mail",
      "Excluir",
    ]);

    expect(document.body.querySelector('[role="menu"]')?.className).toContain(
      "w-[160px]",
    );
    expect(document.body.querySelector('[role="menu"] svg')).toBeNull();
    expect(items[4].className).toContain("text-red-600");
    expect(items[1].hasAttribute("data-disabled")).toBe(false);
  });

  it.each(["CLOSED", "CONVERTED"] as const)(
    "blocks 'Atualizar status' on a %s quote, with the reason",
    async (status) => {
      const items = await openMenu(status);
      const update = items.find(
        (item) => item.textContent === "Atualizar status",
      );

      expect(update?.hasAttribute("data-disabled")).toBe(true);
      expect(quoteStatusBlockedReason(status)).toBe(
        "Orçamento fechado ou convertido não muda de status.",
      );
    },
  );

  it("leaves the open stages free to move", () => {
    expect(quoteStatusBlockedReason("PENDING")).toBeNull();
    expect(quoteStatusBlockedReason("CONTACTED")).toBeNull();
  });
});
