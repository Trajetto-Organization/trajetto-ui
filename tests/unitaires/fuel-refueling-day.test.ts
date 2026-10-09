import { renderHtml, React } from "./helpers/render-html";

import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "@tanstack/react-table";

/**
 * A refueling's date is a DAY picked in a date field, read with the fleet's
 * picked-day rule (features/vehicle/lib/picked-day), like the service order,
 * vehicle and checklist dates. An API client's "YYYY-MM-DD" is stored as
 * 00:00 UTC; read in the browser's zone (formatDate) it showed the day
 * before in the table and on the driver's cards, while the details dialog
 * and the API export already showed the day picked (cross-fixes note).
 *
 * Red→green in any zone west of UTC (Brazil); in UTC both rules agree.
 */
const SENT_AS_DAY = "2026-09-17T00:00:00.000Z";
const PICKED_IN_PANEL = new Date(2026, 8, 17, 0, 0, 0).toISOString();

vi.mock("@/app/(protected)/_components/driver/fuels/hooks", () => ({
  useDriverFuelsList: () => ({
    fuels: [
      {
        id: "fuel-1",
        driverId: "driver-1",
        driver: { name: "Ana Motorista" },
        created_at: "2026-09-17T12:00:00.000Z",
        refueling_date: SENT_AS_DAY,
        fuelType: { description: "Diesel S10" },
        liters_amount: 50.5,
        total_amount: 297.9,
        price_per_liter: 5.899,
        current_mileage: 120350,
        notes: null,
      },
    ],
    errorMessage: null,
    lastElementRef: () => {},
    refetch: () => {},
    showSpinner: false,
    hasError: false,
    isLoading: false,
    isLoaded: true,
    isFetching: false,
  }),
}));

vi.mock("@/components/shared/custom/row-actions", () => ({
  RowActions: ({ entity }: { entity: string }) =>
    React.createElement("span", { "data-entity": entity }),
  RowActionSeparator: () => null,
  RowActionItem: () => null,
}));
vi.mock("@/features/fuel/update-dialog", () => ({
  UpdateFuelDialog: () => null,
}));
vi.mock("@/features/fuel/delete-dialog", () => ({
  DeleteFuelDialog: () => null,
}));
vi.mock("@/app/(protected)/_components/shared/fuel-details-dialog", () => ({
  FuelDetailsDialog: () => null,
}));
vi.mock("@/features/fuel/hooks/use-fuel-permissions", () => ({
  useFuelWritePermissions: () => ({
    hasAllPermissions: true,
    tooltipMessage: "",
  }),
}));
vi.mock("@/lib/user-has-permission", () => ({ useHasPermission: () => true }));

import { DriverFuelsList } from "@/app/(protected)/_components/driver/fuels";
import { buildFuelColumns } from "@/features/fuel/table/columns";
import { FuelRowActions } from "@/features/fuel/table/row-actions";

type Row = Record<string, unknown>;

function cellText(
  columns: ColumnDef<Row>[],
  id: string,
  original: Row,
): string {
  const column = columns.find(
    (candidate) =>
      candidate.id === id ||
      (candidate as { accessorKey?: string }).accessorKey === id,
  );

  expect(column, id).toBeDefined();

  const cell = column!.cell as (context: {
    row: { original: Row };
  }) => React.ReactElement;

  return renderHtml(cell({ row: { original } })).replace(/<[^>]+>/g, "");
}

describe("the refueling date", () => {
  const columns = buildFuelColumns() as unknown as ColumnDef<Row>[];

  it.each([
    ["sent as a day (00:00 UTC)", SENT_AS_DAY],
    ["picked in the panel (local midnight)", PICKED_IN_PANEL],
  ])("in the table, the %s date shows the picked day", (_how, value) => {
    expect(cellText(columns, "refueling_date", { refueling_date: value })).toBe(
      "17/09/2026",
    );
  });

  it("on the driver's card, a date sent as a day shows the picked day", () => {
    const html = renderHtml(
      React.createElement(DriverFuelsList, { vehicleId: "vehicle-1" } as never),
    );

    expect(html).toMatch(/Data do Abastecimento<\/p><p[^>]*>17\/09\/2026</);
    expect(html).not.toContain("16/09/2026");
  });

  it("the row menu names the refueling by the picked day", () => {
    const html = renderHtml(
      React.createElement(FuelRowActions, {
        row: {
          original: {
            id: "fuel-1",
            refueling_date: SENT_AS_DAY,
            vehicle: { license_plate: "ABC1D23" },
          },
        },
      } as never),
    );

    expect(html).toContain(
      'data-entity="o abastecimento ABC1D23 em 17/09/2026"',
    );
  });
});
