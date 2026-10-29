import { renderHtml, React } from "./helpers/render-html";

import { describe, expect, it, vi } from "vitest";

/**
 * The driver's refuelings of one vehicle (/driver/vehicles/:id/fuels).
 *
 * Since DRV-SCOPE-1 the API gives a driver only their own refuelings of the
 * vehicle, never a colleague's. The page still dressed each card as if the
 * list were shared: a "Você" badge (now on every card), a "Motorista" field
 * with their own name, and a search "por motorista". And the price per
 * litre, Decimal(10,3) at the pump, was shown as money: 5.899 read R$ 5,90.
 */
const FUEL = {
  id: "fuel-1",
  driverId: "driver-1",
  driver: { name: "Ana Motorista" },
  created_at: "2026-09-17T12:00:00.000Z",
  refueling_date: "2026-09-17T11:30:00.000Z",
  fuelType: { description: "Diesel S10" },
  liters_amount: 50.5,
  total_amount: 297.9,
  price_per_liter: 5.899,
  current_mileage: 120350,
  notes: null,
};

vi.mock("@/app/(protected)/_components/driver/fuels/hooks", () => ({
  useDriverFuelsList: () => ({
    fuels: [FUEL],
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

import { DriverFuelsList } from "@/app/(protected)/_components/driver/fuels";

function render(): string {
  return renderHtml(
    // The page used to pass the session's driverId to mark "your" cards.
    React.createElement(DriverFuelsList, {
      vehicleId: "vehicle-1",
      driverId: "driver-1",
    } as never),
  ).replace(/&nbsp;| /g, " ");
}

describe("my refuelings of a vehicle", () => {
  it("shows the price per litre with the pump's three decimals", () => {
    expect(render()).toContain("R$ 5,899");
  });

  it("does not present itself as a shared list", () => {
    const html = render();

    expect(html).not.toMatch(/>Você</);
    expect(html).not.toMatch(/>Motorista</);
    expect(html).not.toContain("Ana Motorista");
    expect(html).not.toMatch(/por motorista/i);
  });
});
