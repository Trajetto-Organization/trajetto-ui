import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { CellContext, ColumnDef } from "@tanstack/react-table";

import type { FineRow } from "@/features/fine/lib/types";

/**
 * The fines table shows each date as the day the API names in the company's
 * zone (`*_day`). It used to format the stored instant in the viewer's zone:
 * a Manaus company's fine of the 9th (03:30 UTC of the 10th) read "10/09"
 * in São Paulo, while its status, its rules and the export said the 9th.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// The menu of the row is its own screen (dialogs, server actions): not
// what this file proves.
vi.mock("@/features/fine/row-actions", () => ({ FineRowActions: () => null }));

(globalThis as { React?: typeof React }).React = React;

const { buildFineColumns } = await import("@/features/fine/table-columns");

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const fine = {
  id: "018f0000-0000-7000-8000-0000000000f1",
  status: "PAID",
  violation_date: "2026-09-10T03:30:00.000Z",
  due_date: "2026-10-10T04:00:00.000Z",
  payment_date: "2026-09-13T02:30:00.000Z",
  violation_day: "2026-09-09",
  due_day: "2026-10-10",
  payment_day: "2026-09-12",
  amount: 293.47,
  points: 4,
  trafficViolationCode: {
    code: "7455",
    sub_code: 0,
    description: "Velocidade",
  },
  driver: { name: "Zeca", cpf: "12345678901" },
  vehicle: { license_plate: "FNE1A01", description: "Caminhão" },
  branch: { corporate_reason: "Filial Centro" },
} as unknown as FineRow;

function cellText(columnId: string, row: FineRow): string {
  const column = buildFineColumns().find(
    (candidate: ColumnDef<FineRow>) => candidate.id === columnId,
  );

  if (!column || typeof column.cell !== "function") {
    throw new Error(`column ${columnId} has no cell`);
  }

  const element = column.cell({ row: { original: row } } as CellContext<
    FineRow,
    unknown
  >);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(createElement(React.Fragment, null, element)));

  const text = container.textContent ?? "";

  act(() => root?.unmount());
  container.remove();
  root = null;

  return text;
}

describe("the fines table's date columns", () => {
  it("show the company's day the API names, whatever the viewer's zone", () => {
    expect(cellText("violation_date", fine)).toBe("09/09/2026");
    expect(cellText("due_date", fine)).toBe("10/10/2026");
    expect(cellText("payment_date", fine)).toBe("12/09/2026");
  });

  it("say an unpaid fine is not paid", () => {
    expect(
      cellText("payment_date", {
        ...fine,
        payment_date: null,
        payment_day: null,
      }),
    ).toBe("Não paga");
  });
});
