import { renderHtml, React } from "./helpers/render-html";

import { describe, expect, it } from "vitest";

import type { ColumnDef } from "@tanstack/react-table";

import { buildServiceOrderColumns } from "@/features/service-order/table-columns";
import { buildOrderPartColumns } from "@/features/service-order/order-parts/table-columns";

/**
 * A service order's date and completion are DAYS picked in a date field
 * (dash-time note on fleet civil days). The web picker stores the user's
 * local midnight (03:00 UTC in São Paulo); an API client or an import sends
 * "YYYY-MM-DD", stored as 00:00 UTC, which the browser's zone read as the
 * day before: 17/09 showed as 16/09 west of UTC. They are read with the
 * fleet's picked-day rule now (features/vehicle/lib/picked-day), like the
 * vehicle and checklist dates.
 *
 * Red→green in any zone west of UTC (Brazil); in UTC both rules agree.
 */
type Row = Record<string, unknown>;

function cellText<T>(columns: ColumnDef<T>[], id: string, original: T): string {
  const column = columns.find(
    (candidate) =>
      candidate.id === id ||
      (candidate as { accessorKey?: string }).accessorKey === id,
  );

  expect(column, id).toBeDefined();

  const cell = column!.cell as (context: {
    row: { original: T };
  }) => React.ReactElement;

  return renderHtml(cell({ row: { original } })).replace(/<[^>]+>/g, "");
}

describe("the service order dates", () => {
  const columns = buildServiceOrderColumns("dashboard") as ColumnDef<Row>[];

  it.each([
    ["sent as a day (00:00 UTC)", "2026-09-17T00:00:00.000Z"],
    [
      "picked in the panel (local midnight)",
      new Date(2026, 8, 17).toISOString(),
    ],
  ])("the order's %s date shows the picked day", (_how, value) => {
    expect(cellText(columns, "date", { date: value })).toBe("17/09/2026");
  });

  it("the completion date sent as a day shows the picked day", () => {
    expect(
      cellText(columns, "completion_date", {
        completion_date: "2026-09-17T00:00:00.000Z",
      }),
    ).toBe("17/09/2026");
  });

  it("the order date on the posted parts follows the same rule", () => {
    const partColumns = buildOrderPartColumns("dashboard") as ColumnDef<Row>[];

    expect(
      cellText(partColumns, "serviceOrderDate", {
        serviceOrder: { date: "2026-09-17T00:00:00.000Z" },
      }),
    ).toBe("17/09/2026");
  });
});
