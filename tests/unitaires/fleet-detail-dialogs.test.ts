import { createElement, type ReactNode } from "react";

import { describe, expect, it, vi } from "vitest";

import { renderHtml } from "./helpers/render-html";

/**
 * The shared detail dialogs of a fueling and a checklist.
 *
 * - The price per litre is Decimal(10,3): the dialog formatted it as money,
 *   so a pump price of 5.899 read "R$ 5,90" while the table said "R$ 5,899".
 * - A checklist dated by an API client is stored at 00:00 UTC of its day:
 *   read in the browser's zone the dialog showed the day before (16/09 for
 *   17/09) while the table, the row label and the form showed the right one.
 *
 * The primitives are stubbed to plain elements: a Radix portal renders
 * nothing on the server, and what is under test is the text.
 */
vi.mock("@/components/ui/dialog", () => {
  const pass = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);

  return {
    Dialog: pass,
    DialogDescription: pass,
    DialogHeader: pass,
    DialogScrollContent: pass,
    DialogTitle: pass,
  };
});

vi.mock(
  "@/app/(protected)/_components/shared/fuel-details-dialog/ai-verification-section",
  () => ({
    AIVerificationSection: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/fuel-details-dialog/fuel-info-alert",
  () => ({
    FuelInfoAlert: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/fuel-details-dialog/hooks/use-fuel-technical-details",
  () => ({
    useFuelTechnicalDetails: () => ({
      vehicleData: null,
      isLoading: false,
      previousFuelData: null,
      isLoadingPreviousFuel: false,
      liters: 40,
      pricePerLiter: 5.899,
    }),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/checklist-details-dialog/checklist-ai-verification-section",
  () => ({ ChecklistAIVerificationSection: () => null }),
);

import { FuelDetailsDialog } from "@/app/(protected)/_components/shared/fuel-details-dialog";
import { ChecklistDetailsDialog } from "@/app/(protected)/_components/shared/checklist-details-dialog";

const stamps = {
  created_at: "2026-09-17T15:00:00.000Z",
  updated_at: "2026-09-17T15:00:00.000Z",
};

describe("the fueling's detail dialog", () => {
  it("shows the pump price with its three decimals", () => {
    const html = renderHtml(
      createElement(FuelDetailsDialog, {
        isOpen: true,
        onOpenChange: () => undefined,
        fuelData: {
          id: "f1",
          vehicleId: "v1",
          refueling_date: "2026-09-17T13:00:00.000Z",
          liters_amount: 40,
          price_per_liter: 5.899,
          total_amount: 235.96,
          current_mileage: 120000,
          ...stamps,
        } as never,
      }),
    );

    expect(html).toContain("R$ 5,899");
    expect(html).not.toContain("R$ 5,90<");
    // A price per litre, not a money total like the Total badge beside it.
    expect(html.replace(/<!-- -->/g, "")).toContain("R$ 5,899/L");
    expect(html).toContain("Preço por litro");
  });

  it("shows a fueling dated by an API client on its own day", () => {
    // Stored at 00:00 UTC; the API reads it as that day (pickedDayKey).
    const html = renderHtml(
      createElement(FuelDetailsDialog, {
        isOpen: true,
        onOpenChange: () => undefined,
        fuelData: {
          id: "f2",
          vehicleId: "v1",
          refueling_date: "2026-09-17T00:00:00.000Z",
          liters_amount: 40,
          price_per_liter: 5.899,
          total_amount: 235.96,
          current_mileage: 120000,
          ...stamps,
        } as never,
      }),
    );

    expect(html).toContain("17/09/2026");
    expect(html).not.toContain("16/09/2026");
  });
});

describe("the checklist's detail dialog", () => {
  it("shows a date-only checklist on its own day", () => {
    const html = renderHtml(
      createElement(ChecklistDetailsDialog, {
        isOpen: true,
        onOpenChange: () => undefined,
        checklistData: {
          id: "c1",
          vehicleId: "v1",
          checklist_date: "2026-09-17T00:00:00.000Z",
          current_mileage: 120000,
          overall_condition: "good",
          notes: null,
          ...stamps,
        } as never,
      }),
    );

    expect(html).toContain("17/09/2026");
    expect(html).not.toContain("16/09/2026");
  });
});
