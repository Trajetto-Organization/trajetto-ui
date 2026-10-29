import { describe, expect, it } from "vitest";

import {
  FUEL_TABLE,
  fuelFilterQuery,
  fuelListQuery,
} from "@/features/fuel/lib/server-table";
import {
  buildFuelStatsData,
  verifiedShare,
} from "@/features/fuel/lib/stats-data";
import { businessIdQuery, scopedBusinessId } from "@/features/fuel/lib/scope";
import {
  changedFuelLinks,
  fuelFormFromRecord,
  fuelValuesChanged,
  hasFuelEditChanges,
} from "@/features/fuel/lib/update-diff";
import {
  FUEL_TYPE_TABLE,
  fuelTypeListQuery,
} from "@/features/fuel-type/lib/server-table";

/**
 * The unified Abastecimento / Tipo de Combustível screens (decision 8.7):
 * what they ask the API, which company they act on, what the cards show and
 * what an edit sends.
 */
const A = "018f0000-0000-7000-8000-00000000000a";
const BRANCH = "018f0000-0000-7000-8000-0000000000b1";
const VEHICLE = "018f0000-0000-7000-8000-0000000000c1";

describe("the refuelings list asks the server (decision 8.8)", () => {
  it("forwards the declared sort and facets, as the API names them", () => {
    expect(
      fuelListQuery({
        sort: "total_amount",
        order: "desc",
        branchId: BRANCH,
        vehicleId: `${VEHICLE},not-a-uuid`,
        businessId: A,
        page: "3",
      }),
    ).toEqual({
      sort: "total_amount",
      order: "desc",
      branchId: BRANCH,
      vehicleId: VEHICLE,
    });
  });

  it("drops a column the API cannot order by (an old bookmark)", () => {
    expect(fuelListQuery({ sort: "odometer_photo", order: "asc" })).toEqual({});
  });

  it("keeps facet columns and sort keys equal to the table's column ids", () => {
    expect(Object.keys(FUEL_TABLE.facets)).toEqual([
      "branchName",
      "vehicle_license_plate",
      "fuel_type_description",
    ]);
    expect(FUEL_TABLE.sortable).toContain("vehicle_license_plate");
    expect(FUEL_TABLE.defaultSort).toEqual({ id: "created_at", desc: true });
  });

  it("gives the export the facets and never the order", () => {
    expect(
      fuelFilterQuery({
        sort: "liters_amount",
        order: "asc",
        fuelTypeId: VEHICLE,
      }),
    ).toEqual({ fuelTypeId: VEHICLE });
  });

  it("orders fuel types on the server too, with no facet", () => {
    expect(FUEL_TYPE_TABLE.facets).toEqual({});
    expect(fuelTypeListQuery({ sort: "description", order: "asc" })).toEqual({
      sort: "description",
      order: "asc",
    });
  });
});

describe("which company a screen acts on", () => {
  it("is the selector's on /admin and only a UUID", () => {
    expect(scopedBusinessId("admin", A, "session")).toBe(A);
    expect(scopedBusinessId("admin", "../../x", "session")).toBeUndefined();
    expect(scopedBusinessId("admin", null, "session")).toBeUndefined();
  });

  it("is the session's on /dashboard, whatever the URL says", () => {
    expect(scopedBusinessId("dashboard", A, "session-company")).toBe(
      "session-company",
    );
  });

  it("is sent to the API only by the MASTER's screen", () => {
    expect(businessIdQuery("admin", A)).toEqual({ businessId: A });
    expect(businessIdQuery("dashboard", A)).toEqual({});
    expect(businessIdQuery("admin", undefined)).toEqual({});
  });
});

describe("the cards read the API's totals, never the page", () => {
  it("formats the server's sums for the whole filtered set", () => {
    const data = buildFuelStatsData(12, {
      total: 12,
      totalLiters: 186.5,
      totalAmount: 1025.75,
      verifiedOdometer: 3,
    });

    expect(data.totalRefuelings).toBe(12);
    expect(data.totalLiters).toBe("186,50 L");
    expect(data.totalAmount.replace(/\s/g, " ")).toBe("R$ 1.025,75");
    expect(verifiedShare(data)).toBe("3 (25%)");
  });

  it("says — instead of a confident zero when the API sent no tally", () => {
    const data = buildFuelStatsData(40, undefined);

    expect(data.totalRefuelings).toBe(40);
    expect(data.totalLiters).toBe("—");
    expect(data.totalAmount).toBe("—");
    expect(verifiedShare(data)).toBe("—");
  });
});

describe("an edit sends only what changed (FLEET-FUEL-1, decision 2.5)", () => {
  const record = {
    branchId: "b1",
    vehicleId: "v1",
    driverId: "d1",
    fuelTypeId: "f1",
    refueling_date: "2026-08-10T03:00:00.000Z",
    current_mileage: 15234,
    liters_amount: 45.5,
    price_per_liter: 5.49,
    notes: null,
  };

  it("leaves untouched links out, so an inactive vehicle's history can be corrected", () => {
    expect(changedFuelLinks(record, { ...record })).toEqual({});
    expect(changedFuelLinks(record, { ...record, driverId: "d2" })).toEqual({
      driverId: "d2",
    });
    expect(changedFuelLinks(record, { ...record, vehicleId: "" })).toEqual({});
  });

  it("starts pristine and notices a change in value, not in formatting", () => {
    const typed = fuelFormFromRecord(record);

    expect(typed.current_mileage).toBe("15.234");
    expect(fuelValuesChanged(record, typed)).toBe(false);

    expect(
      fuelValuesChanged(record, { ...typed, liters_amount: "45,50" }),
    ).toBe(false);
    expect(
      fuelValuesChanged(record, { ...typed, price_per_liter: "5,50" }),
    ).toBe(true);
    expect(fuelValuesChanged(record, { ...typed, notes: "Posto novo" })).toBe(
      true,
    );
  });

  it("keeps Save disabled until something changed", () => {
    const none = { values: false, links: false, photo: false, location: false };

    expect(hasFuelEditChanges(none)).toBe(false);
    expect(hasFuelEditChanges({ ...none, photo: true })).toBe(true);
    expect(hasFuelEditChanges({ ...none, location: true })).toBe(true);
  });
});
