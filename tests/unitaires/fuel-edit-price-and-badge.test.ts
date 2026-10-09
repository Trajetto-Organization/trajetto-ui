import { describe, expect, it } from "vitest";

import {
  formatPricePerLiter,
  sanitizePriceTyping,
} from "@/features/fuel/lib/price";
import {
  applyFuelEdit,
  fuelFormFromRecord,
  fuelLocationChanged,
  fuelValuesChanged,
  type FuelEditRecord,
} from "@/features/fuel/lib/update-diff";
import { fuelAIStatusBadge } from "@/features/fuel/lib/ai-status";
import { parseCurrencyToNumber } from "@/lib/format-values";

/**
 * The refueling edit and table, where the web disagreed with what it stored:
 *
 * - price per litre is Decimal(10,3) and the app records pump prices like
 *   R$ 5,899, but the web showed and re-saved it with two digits;
 * - the edit resent an untouched GPS fix, which the API records as a manual
 *   edit by the person saving;
 * - the admin table's AI column read the status string where the stored
 *   boolean belonged.
 */
const nbsp = (text: string) => text.replace(/\s/g, " ");

const RECORD: FuelEditRecord = {
  id: "018f0000-0000-7000-8000-0000000000f1",
  businessId: "018f0000-0000-7000-8000-00000000000a",
  branchId: "b1",
  vehicleId: "v1",
  driverId: "d1",
  fuelTypeId: "f1",
  refueling_date: "2026-08-10T03:00:00.000Z",
  current_mileage: 15234.5,
  liters_amount: 45.5,
  price_per_liter: 5.899,
  notes: null,
  latitude: -23.55,
  longitude: -46.63,
};

describe("the price per litre keeps the pump's three decimals", () => {
  it("formats 5.899 as R$ 5,899 and a round price with two digits", () => {
    expect(nbsp(formatPricePerLiter(5.899))).toBe("R$ 5,899");
    expect(nbsp(formatPricePerLiter(5.9))).toBe("R$ 5,90");
    expect(nbsp(formatPricePerLiter("5,899"))).toBe("R$ 5,899");
  });

  it("shows the stored price in the edit form and reads it back unchanged", () => {
    // Red before: formatToBrazilianCurrency showed "R$ 5,90" and the
    // pristine form counted as changed (Save enabled, 5,90 saved).
    const typed = fuelFormFromRecord(RECORD);

    expect(nbsp(typed.price_per_liter)).toBe("R$ 5,899");
    expect(fuelValuesChanged(RECORD, typed)).toBe(false);
    expect(parseCurrencyToNumber(typed.price_per_liter)).toBe(5.899);
  });

  it("notices a real change in the third decimal", () => {
    const typed = fuelFormFromRecord(RECORD);

    expect(
      fuelValuesChanged(RECORD, { ...typed, price_per_liter: "R$ 5,897" }),
    ).toBe(true);
  });

  it("keeps at most three digits after the comma while typing", () => {
    expect(sanitizePriceTyping("5,8999")).toBe("5,899");
    expect(sanitizePriceTyping("R$ 5,89")).toBe("5,89");
    expect(sanitizePriceTyping("5")).toBe("5");
    expect(sanitizePriceTyping("abc5,9x9")).toBe("5,99");
  });
});

describe("what an edit adds to the form", () => {
  const values = fuelFormFromRecord(RECORD);
  const untouched = {
    latitude: RECORD.latitude ?? null,
    longitude: RECORD.longitude ?? null,
  };

  const posted = (edit: Partial<Parameters<typeof applyFuelEdit>[1]>) => {
    const form = new FormData();

    // What FuelFields' hidden input posts for the whole km shown.
    form.set("current_mileage", "15234");

    applyFuelEdit(form, {
      record: RECORD,
      values,
      selectedLinks: { ...RECORD },
      location: untouched,
      ...edit,
    });

    return form;
  };

  it("does not resend an untouched location (it would be audited as a manual edit)", () => {
    // Red before: the dialog appended latitude and longitude on every save.
    const form = posted({});

    expect(fuelLocationChanged(RECORD, untouched)).toBe(false);
    expect(form.has("latitude")).toBe(false);
    expect(form.has("longitude")).toBe(false);
  });

  it("sends a moved location, and an empty pair to clear it", () => {
    const moved = posted({ location: { latitude: -23.56, longitude: -46.64 } });

    expect(moved.get("latitude")).toBe("-23.56");
    expect(moved.get("longitude")).toBe("-46.64");

    const cleared = posted({ location: { latitude: null, longitude: null } });

    expect(cleared.get("latitude")).toBe("");
    expect(cleared.get("longitude")).toBe("");
  });

  it("keeps the exact stored km when the whole km shown was not touched", () => {
    expect(posted({}).get("current_mileage")).toBe("15234.5");

    const typedKm = posted({
      values: { ...values, current_mileage: "15.300" },
    });

    expect(typedKm.get("current_mileage")).toBe("15234");
  });

  it("carries the ids and only the links that changed", () => {
    const form = posted({ selectedLinks: { ...RECORD, driverId: "d2" } });

    expect(form.get("fuelId")).toBe(RECORD.id);
    expect(form.get("businessId")).toBe(RECORD.businessId);
    expect(form.get("driverId")).toBe("d2");
    expect(form.has("vehicleId")).toBe(false);
    expect(form.has("branchId")).toBe(false);
  });
});

describe("the AI verification badge", () => {
  it("falls back to the stored boolean for a row without a verdict", () => {
    // Red before (admin): the status string stood where the boolean
    // belonged, so the badge was empty.
    expect(
      fuelAIStatusBadge(
        { odometer_ai_status: null, odometer_verified: true },
        undefined,
      ).label,
    ).toBe("Verificado");
    expect(
      fuelAIStatusBadge(
        { odometer_ai_status: null, odometer_verified: false },
        undefined,
      ).label,
    ).toBe("Não verificado");
  });

  it("shows the stored verdict, and the live analysis over it", () => {
    const stored = { odometer_ai_status: "mismatch", odometer_verified: false };

    expect(fuelAIStatusBadge(stored, undefined).label).toBe("Divergente");
    expect(fuelAIStatusBadge(stored, { step: "reading" }).label).toBe(
      "Analisando...",
    );
    expect(
      fuelAIStatusBadge(stored, {
        step: "completed",
        overallStatus: "verified",
      }).label,
    ).toBe("Verificado IA");
  });

  // ADR 0010 §5: the OCR reader cannot judge fraud, so a "verified" from it
  // only means the km agrees. Never the green "Verificado IA" seal for it.
  it("says 'Km confere', in a neutral badge, when the reading did not assess fraud", () => {
    const stored = {
      odometer_ai_status: "verified",
      odometer_verified: false,
      odometer_ai_details: {
        fraudAssessed: false,
        details: "Km lida confere com a informada.",
      },
    };

    const badge = fuelAIStatusBadge(stored, undefined);
    expect(badge.label).toBe("Km confere");
    expect(badge.className).not.toMatch(/green/);
    expect(badge.title).toBe("Km lida confere com a informada.");

    const live = fuelAIStatusBadge(
      { odometer_ai_status: "pending", odometer_verified: false },
      {
        step: "completed",
        overallStatus: "verified",
        currentResult: { fraudAssessed: false },
      },
    );
    expect(live.label).toBe("Km confere");
    expect(live.className).not.toMatch(/green/);

    // A reader that judged fraud keeps the seal.
    expect(
      fuelAIStatusBadge(
        { ...stored, odometer_ai_details: { details: "ok" } },
        undefined,
      ).label,
    ).toBe("Verificado IA");
    // Other verdicts are not touched by the flag.
    expect(
      fuelAIStatusBadge(
        { ...stored, odometer_ai_status: "mismatch" },
        undefined,
      ).label,
    ).toBe("Divergente");
  });
});
