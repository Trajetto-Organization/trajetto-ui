import { describe, expect, it } from "vitest";

import {
  applyFuelEdit,
  fuelFormFromRecord,
  fuelValuesChanged,
  type FuelEditRecord,
} from "@/features/fuel/lib/update-diff";
import {
  orderDaysToSend,
  orderFieldsChanged,
  toFieldValues,
} from "@/features/service-order/update-form/dirty";
import type { ServiceOrderRow } from "@/features/service-order/server-table";

/**
 * The service-order and refueling edits, on their day fields (cross-fixes
 * note, same rule as the checklist edit in features/vehicle-checklist/lib/
 * edit-form.ts).
 *
 * The date picker opens a day stored as 00:00 UTC (an API client's
 * "YYYY-MM-DD") on that day, but re-picking the same day hands back local
 * midnight (03:00 UTC in São Paulo). The edit then counted an untouched day
 * as a change (Save enabled, decision 2.5) and posted another instant: the
 * record moved from 00:00Z to 03:00Z. Now the day is compared as the day it
 * means, and an unchanged day goes out exactly as stored.
 *
 * Red→green in any zone west of UTC (Brazil); in UTC both rules agree.
 */
const STORED_AS_DAY = "2026-09-17T00:00:00.000Z";
const SAME_DAY_PICKED = new Date(2026, 8, 17).toISOString();
const DAY_BEFORE_PICKED = new Date(2026, 8, 16).toISOString();

describe("editing a service order", () => {
  const ORDER = {
    id: "018f0000-0000-7000-8000-000000000001",
    date: STORED_AS_DAY,
    completion_date: STORED_AS_DAY,
    maintenance_type: "INTERNAL",
    total_amount: 100,
    description: "Troca de óleo",
    current_mileage_at_service: 120000,
    maintenance_interval_km_at_service: 10000,
    last_maintenance_mileage_at_service: 110000,
    new_mileage_after_service: 120100,
  } as unknown as ServiceOrderRow;

  const original = toFieldValues(ORDER);

  it("does not count the same day picked again as a change", () => {
    expect(
      orderFieldsChanged(
        original,
        {
          ...original,
          date: SAME_DAY_PICKED,
          completion_date: SAME_DAY_PICKED,
        },
        { includeSnapshot: false },
      ),
    ).toBe(false);
  });

  it("counts a day switch and a cleared completion", () => {
    expect(
      orderFieldsChanged(
        original,
        { ...original, date: DAY_BEFORE_PICKED },
        { includeSnapshot: false },
      ),
    ).toBe(true);
    expect(
      orderFieldsChanged(
        original,
        { ...original, completion_date: "" },
        { includeSnapshot: false },
      ),
    ).toBe(true);
  });

  it("sends an unchanged day exactly as stored", () => {
    expect(
      orderDaysToSend(ORDER, {
        date: SAME_DAY_PICKED,
        completion_date: SAME_DAY_PICKED,
      }),
    ).toEqual({ date: STORED_AS_DAY, completion_date: STORED_AS_DAY });
  });

  it("sends a new day as picked, and a cleared completion as empty", () => {
    expect(
      orderDaysToSend(ORDER, { date: DAY_BEFORE_PICKED, completion_date: "" }),
    ).toEqual({
      date: DAY_BEFORE_PICKED,
      completion_date: "",
    });
  });

  it("an order still open receives the picked completion", () => {
    const open = { ...ORDER, completion_date: null } as ServiceOrderRow;

    expect(
      orderDaysToSend(open, {
        date: STORED_AS_DAY,
        completion_date: SAME_DAY_PICKED,
      }),
    ).toEqual({
      date: STORED_AS_DAY,
      completion_date: SAME_DAY_PICKED,
    });
  });
});

describe("editing a refueling", () => {
  const RECORD: FuelEditRecord = {
    id: "018f0000-0000-7000-8000-0000000000f1",
    businessId: "018f0000-0000-7000-8000-00000000000a",
    branchId: "b1",
    vehicleId: "v1",
    driverId: "d1",
    fuelTypeId: "f1",
    refueling_date: STORED_AS_DAY,
    current_mileage: 15234,
    liters_amount: 45.5,
    price_per_liter: 5.49,
    notes: null,
  };

  const typed = fuelFormFromRecord(RECORD);

  const posted = (record: FuelEditRecord, refuelingDate: string): FormData => {
    const form = new FormData();

    // What the date field's hidden input posts: the value on screen.
    form.set("refueling_date", refuelingDate);

    applyFuelEdit(form, {
      record,
      values: { ...fuelFormFromRecord(record), refueling_date: refuelingDate },
      selectedLinks: { ...record },
      location: { latitude: null, longitude: null },
    });

    return form;
  };

  it("does not count the same day picked again as a change", () => {
    expect(
      fuelValuesChanged(RECORD, { ...typed, refueling_date: SAME_DAY_PICKED }),
    ).toBe(false);
    expect(
      fuelValuesChanged(RECORD, {
        ...typed,
        refueling_date: DAY_BEFORE_PICKED,
      }),
    ).toBe(true);
  });

  it("sends an unchanged day exactly as stored", () => {
    expect(posted(RECORD, SAME_DAY_PICKED).get("refueling_date")).toBe(
      STORED_AS_DAY,
    );
  });

  it("an app refueling moved to another day keeps the time it was made", () => {
    const fromApp = {
      ...RECORD,
      refueling_date: new Date(2026, 8, 17, 14, 32).toISOString(),
    };

    expect(posted(fromApp, DAY_BEFORE_PICKED).get("refueling_date")).toBe(
      new Date(2026, 8, 16, 14, 32).toISOString(),
    );
  });
});
