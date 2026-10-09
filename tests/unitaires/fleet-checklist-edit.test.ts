import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { inTimeZone } from "./helpers/in-time-zone";

import { changedChecklistLinks } from "@/features/vehicle-checklist/lib/edit-links";
import {
  checklistEditOriginalValues,
  checklistEditPayload,
  isChecklistEditDirty,
} from "@/features/vehicle-checklist/lib/edit-form";
import { formatPickedDay } from "@/features/vehicle/lib/presentation";

import {
  vehicleEditPayload,
  vehicleFormValues,
  vehicleRelations,
} from "@/features/vehicle/lib/form-values";
import type { VehicleRow } from "@/features/vehicle/types";
import {
  createUpdateVehicleChecklistSchema,
  updateVehicleChecklistFormSchema,
} from "@/schemas/create-update-vehicle-checklist-schema";

const BRANCH = "0198a8d0-70c0-7000-8000-0000000000b1";
const CLOSED_BRANCH = "0198a8d0-70c0-7000-8000-0000000000b2";
const VEHICLE = "0198a8d0-70c0-7000-8000-0000000000c1";
const DRIVER = "0198a8d0-70c0-7000-8000-0000000000d1";
const FORMER_DRIVER = "0198a8d0-70c0-7000-8000-0000000000d2";

describe("changedChecklistLinks (FLEET-FUEL-1)", () => {
  const original = {
    branchId: CLOSED_BRANCH,
    vehicleId: VEHICLE,
    driverId: FORMER_DRIVER,
  };

  it("sends nothing when the person kept every link", () => {
    expect(changedChecklistLinks(original, { ...original })).toEqual({});
  });

  it("sends only the link that was re-pointed", () => {
    expect(
      changedChecklistLinks(original, {
        ...original,
        branchId: BRANCH,
        driverId: DRIVER,
      }),
    ).toEqual({ branchId: BRANCH, driverId: DRIVER });
  });

  it("never turns an empty picker into a cleared link", () => {
    expect(
      changedChecklistLinks(original, { branchId: "", vehicleId: VEHICLE }),
    ).toEqual({});
  });
});

describe("the edit's form schema", () => {
  const answers = {
    current_mileage: "15000",
    checklist_date: new Date(2026, 8, 17).toISOString(),
    tires_condition: "good",
    headlights_working: true,
    taillights_working: true,
    turn_signals_working: true,
    bumpers_condition: "good",
    windshield_condition: "good",
    mirrors_condition: "good",
    seatbelts_working: true,
    dashboard_working: true,
    steering_wheel_condition: "good",
    brakes_working: true,
    clutch_working: true,
    fuel_level_adequate: true,
    oil_level_adequate: true,
    radiator_water_adequate: true,
    brake_fluid_adequate: true,
    battery_condition: "good",
    driver_license_valid: true,
    vehicle_documents_valid: true,
    insurance_valid: true,
    fire_extinguisher_valid: true,
    warning_triangle_present: true,
    jack_present: true,
    spare_tire_condition: "good",
    overall_condition: "approved",
  };

  it("accepts an edit that leaves the links out, which the create still requires", () => {
    expect(updateVehicleChecklistFormSchema.safeParse(answers).success).toBe(
      true,
    );
    expect(createUpdateVehicleChecklistSchema.safeParse(answers).success).toBe(
      false,
    );
  });

  it("still validates a link the edit does send", () => {
    expect(
      updateVehicleChecklistFormSchema.safeParse({
        ...answers,
        driverId: "não-é-uuid",
      }).success,
    ).toBe(false);
  });
});

// In the machine's zone; the same rules run in São Paulo and Tokyo below.
describe("formatPickedDay", () => {
  it("reads a date-only value stored at 00:00 UTC as that day, in any browser zone", () => {
    // formatDate read it in the browser's zone: 16/09 in São Paulo.
    expect(formatPickedDay("2026-09-17T00:00:00.000Z")).toBe("17/09/2026");
  });

  it("reads the date picker's local midnight as the day that was picked", () => {
    expect(formatPickedDay(new Date(2026, 8, 17).toISOString())).toBe(
      "17/09/2026",
    );
  });

  it("says N/A for nothing or garbage", () => {
    expect(formatPickedDay(null)).toBe("N/A");
    expect(formatPickedDay("não é data")).toBe("N/A");
  });
});

describe("the vehicle form opens a stored day on that day", () => {
  const vehicle = {
    id: "0198a8d0-70c0-7000-8000-0000000000c1",
    description: "Caminhão",
    license_plate: "ABC1D23",
    brand: "Marca",
    model: "Modelo",
    // Written by an API client as "2026-09-17": 00:00 UTC.
    acquisition_date: "2026-09-17T00:00:00.000Z",
    last_maintenance_date: null,
    fleet_type: "OWNED",
    current_mileage: 1000,
    maintenance_interval_km: 10000,
    maintenance_interval_months: 6,
    renavam: "12345678901",
    manufacturing_year: "2025-01-01T00:00:00.000Z",
    model_year: "2026-01-01T00:00:00.000Z",
    number_of_axles: 2,
    status: "ACTIVE",
  } as unknown as VehicleRow;

  it("hands the picker local midnight of the stored day", () => {
    // The raw value opened the picker on 16/09 in São Paulo.
    expect(vehicleFormValues(vehicle).acquisition_date).toBe(
      new Date(2026, 8, 17).toISOString(),
    );
  });

  it("does not count that as a change: an untouched date is not sent", () => {
    const initial = {
      values: vehicleFormValues(vehicle),
      relations: vehicleRelations(vehicle),
    };

    expect(
      vehicleEditPayload(initial, {
        ...initial,
        values: { ...initial.values },
      }),
    ).toEqual({});
  });
});

/**
 * The day rules in a Brazilian browser, whatever zone the machine or the CI
 * runner is in: they only fail behind UTC, where they matter. A vitest
 * worker cannot change its own zone, so they run in a child Node process
 * started in it (helpers/in-time-zone).
 */
const PICKED_DAY = join(
  __dirname,
  "..",
  "..",
  "src",
  "features",
  "vehicle",
  "lib",
  "picked-day.ts",
);

interface DayRules {
  keys: Array<string | null>;
  labels: string[];
  picker: string[];
  changed: boolean[];
  sent: string[];
  localMidnight17: string;
  localMidnight16: string;
  localMidnight18: string;
}

// An API client's "2026-09-17", stored as 00:00 UTC; and the app's
// inspection at 22:10 on the 17th in São Paulo, already the 18th in UTC.
const rulesIn = (timeZone: string) =>
  inTimeZone<DayRules>(
    timeZone,
    { day: PICKED_DAY },
    `const dateOnly = "2026-09-17T00:00:00.000Z";
    const lateInspection = "2026-09-18T01:10:00.000Z";
    const localMidnight17 = new Date(2026, 8, 17).toISOString();
    const localMidnight16 = new Date(2026, 8, 16).toISOString();
    const localMidnight18 = new Date(2026, 8, 18).toISOString();
    return {
      keys: [
        day.pickedDayKey(dateOnly),
        day.pickedDayKey(lateInspection),
        day.pickedDayKey(localMidnight17),
        day.pickedDayKey(""),
      ],
      labels: [day.formatPickedDay(dateOnly), day.formatPickedDay(localMidnight17), day.formatPickedDay(null)],
      picker: [day.asPickerDay(dateOnly), day.asPickerDay(lateInspection), day.asPickerDay(new Date(lateInspection))],
      changed: [
        day.pickedDayChanged(lateInspection, localMidnight18),
        day.pickedDayChanged(day.asPickerDay(dateOnly), dateOnly),
        day.pickedDayChanged(lateInspection, localMidnight17),
      ],
      sent: [
        day.dayToSend(dateOnly, day.asPickerDay(dateOnly)),
        day.dayToSend(lateInspection, localMidnight17),
        day.dayToSend(lateInspection, localMidnight16),
        day.dayToSend(dateOnly, localMidnight16),
      ],
      localMidnight17,
      localMidnight16,
      localMidnight18,
    };`,
  );

describe("the checklist edit's date, in São Paulo (picked-day)", () => {
  it("reads each stored value as the day the table shows, and opens the picker on it", async () => {
    const rules = await rulesIn("America/Sao_Paulo");

    expect(rules.keys).toEqual([
      "2026-09-17",
      "2026-09-17",
      "2026-09-17",
      null,
    ]);
    // Red before (formatDate in the browser's zone): 16/09/2026 for the first.
    expect(rules.labels).toEqual(["17/09/2026", "17/09/2026", "N/A"]);

    // Red before: the edit form handed the raw value to the picker, which
    // opened on 16/09 while the table said 17/09.
    expect(rules.localMidnight17).toBe("2026-09-17T03:00:00.000Z");
    expect(rules.picker).toEqual([
      rules.localMidnight17,
      "2026-09-18T01:10:00.000Z",
      "2026-09-18T01:10:00.000Z",
    ]);
  });

  it("sees a changed day where the UTC date of the strings did not", async () => {
    // The old dirty check compared split("T")[0]: "2026-09-18" on both
    // sides, so moving the 22:10 inspection of the 17th to the 18th was not
    // a change, and opening a date-only checklist counted as one.
    const rules = await rulesIn("America/Sao_Paulo");

    expect(rules.changed).toEqual([true, false, false]);
  });

  it("sends the stored value back while the day is unchanged, the picked day at its time otherwise", async () => {
    const rules = await rulesIn("America/Sao_Paulo");

    // Red before: the moved inspection went out at midnight of the 16th,
    // before every record of that day, which the API then read as after it.
    expect(rules.sent).toEqual([
      "2026-09-17T00:00:00.000Z",
      "2026-09-18T01:10:00.000Z",
      "2026-09-17T01:10:00.000Z",
      rules.localMidnight16,
    ]);
  });

  it("reads the same days east of UTC", async () => {
    const rules = await rulesIn("Asia/Tokyo");

    // 01:10 UTC is 10:10 on the 18th in Tokyo: a different day there, and
    // the rule says so; the date-only value stays the 17th.
    expect(rules.keys).toEqual([
      "2026-09-17",
      "2026-09-18",
      "2026-09-17",
      null,
    ]);
    expect(rules.labels[0]).toBe("17/09/2026");

    // Moved to the 16th, it stays at 10:10 there.
    expect(rules.sent[2]).toBe("2026-09-16T01:10:00.000Z");
  });
});

/**
 * The edit form's own rules (features/vehicle-checklist/lib/edit-form): what
 * the dialog opens on, when Salvar turns on and what it posts. They lived in
 * the dialog, where going back to the raw date, the split("T") comparison or
 * the always-sent picked date failed no test.
 */
const SRC = join(__dirname, "..", "..", "src");
const EDIT_FORM = join(
  SRC,
  "features",
  "vehicle-checklist",
  "lib",
  "edit-form.ts",
);

/**
 * The app's "@/..." paths and extensionless imports, resolved for the plain
 * Node process the zone tests run in (its type stripping resolves neither).
 */
const ALIAS_HOOK = `
export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = [".ts", ".tsx", ".js", ".mjs", ".json"].some((end) => specifier.endsWith(end));
  if (specifier.startsWith("@/")) {
    return next(new URL(specifier.slice(2) + ".ts", ${JSON.stringify(pathToFileURL(SRC + sep).href)}).href, context);
  }
  if (relative && !hasExtension) return next(specifier + ".ts", context);
  return next(specifier, context);
}`;

const editFormIn = <T>(timeZone: string, body: string) =>
  inTimeZone<T>(
    timeZone,
    {},
    `const { register } = await import("node:module");
    register("data:text/javascript," + encodeURIComponent(${JSON.stringify(ALIAS_HOOK)}));
    const form = await import(${JSON.stringify(pathToFileURL(EDIT_FORM).href)});
    ${body}`,
  );

interface EditFormRules {
  opensOn: unknown[];
  dirty: boolean[];
  sent: unknown[];
  localMidnight16: string;
  localMidnight17: string;
}

// The 22:10 inspection of the 17th in São Paulo (the 18th in UTC), and an
// API client's date-only 17th.
const editFormRules = (timeZone: string) =>
  editFormIn<EditFormRules>(
    timeZone,
    `const stored = (checklist_date) => ({
      id: "c1", businessId: "b1", checklist_date, current_mileage: 15000, notes: null,
      branchId: "br1", vehicleId: "v1", driverId: "d1", tires_condition: "good",
    });
    const late = stored("2026-09-18T01:10:00.000Z");
    const dateOnly = stored("2026-09-17T00:00:00.000Z");
    const localMidnight16 = new Date(2026, 8, 16).toISOString();
    const localMidnight17 = new Date(2026, 8, 17).toISOString();
    const localMidnight18 = new Date(2026, 8, 18).toISOString();
    const lateOpen = form.checklistEditOriginalValues(late);
    const dateOnlyOpen = form.checklistEditOriginalValues(dateOnly);
    const at = (open, checklist_date) => form.isChecklistEditDirty(open, { ...open, checklist_date });
    const sentDate = (checklist, picked) => form.checklistEditPayload(checklist, picked, {}).checklist_date;
    return {
      opensOn: [lateOpen.checklist_date, dateOnlyOpen.checklist_date],
      dirty: [
        at(lateOpen, localMidnight18),
        at(lateOpen, localMidnight17),
        at(dateOnlyOpen, dateOnlyOpen.checklist_date),
        at(dateOnlyOpen, localMidnight16),
      ],
      sent: [
        sentDate(late, localMidnight17),
        sentDate(late, localMidnight16),
        sentDate(dateOnly, dateOnlyOpen.checklist_date),
        sentDate(dateOnly, localMidnight16),
      ],
      localMidnight16,
      localMidnight17,
    };`,
  );

describe("the checklist edit form, in São Paulo (edit-form)", () => {
  it("opens a date-only checklist on its own day", async () => {
    const rules = await editFormRules("America/Sao_Paulo");

    // Red before: the raw 00:00 UTC opened the picker on the 16th.
    expect(rules.opensOn).toEqual([
      "2026-09-18T01:10:00.000Z",
      rules.localMidnight17,
    ]);
  });

  it("turns Salvar on for a changed day only", async () => {
    const rules = await editFormRules("America/Sao_Paulo");

    // Red before (split("T")[0]): the 22:10 inspection moved to the 18th was
    // no change, the same 17th picked again was one.
    expect(rules.dirty).toEqual([true, false, false, true]);
  });

  it("posts the stored date for an unchanged day, the picked day at the record's time otherwise", async () => {
    const rules = await editFormRules("America/Sao_Paulo");

    // Red before: the picked local midnight always went out.
    expect(rules.sent).toEqual([
      "2026-09-18T01:10:00.000Z",
      "2026-09-17T01:10:00.000Z",
      "2026-09-17T00:00:00.000Z",
      rules.localMidnight16,
    ]);
  });

  it("reads the same inspection as the 18th in Tokyo", async () => {
    const rules = await editFormRules("Asia/Tokyo");

    // 10:10 on the 18th there: the 18th picked again is no change, the 17th is.
    expect(rules.dirty.slice(0, 2)).toEqual([false, true]);
    expect(rules.sent[0]).toBe("2026-09-17T01:10:00.000Z");
  });
});

describe("the checklist edit's payload, in the machine's zone", () => {
  // An inspection at 17:32 UTC: never a midnight in any zone.
  const stored = {
    id: "0198a8d0-70c0-7000-8000-0000000000e1",
    businessId: "0198a8d0-70c0-7000-8000-0000000000aa",
    checklist_date: "2026-09-17T17:32:00.000Z",
    current_mileage: 15_000,
    notes: null,
    branchId: CLOSED_BRANCH,
    vehicleId: VEHICLE,
    driverId: FORMER_DRIVER,
  };

  const local = new Date(stored.checklist_date);
  const pickedSameDay = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
  ).toISOString();

  it("sends the ids, the re-pointed links only, and the stored date for the same day", () => {
    expect(
      checklistEditPayload(stored, pickedSameDay, {
        branchId: CLOSED_BRANCH,
        vehicleId: VEHICLE,
        driverId: DRIVER,
      }),
    ).toEqual({
      checklistId: stored.id,
      businessId: stored.businessId,
      driverId: DRIVER,
      checklist_date: stored.checklist_date,
    });
  });

  it("moves a changed day at the record's own time of day", () => {
    const pickedDayBefore = new Date(
      local.getFullYear(),
      local.getMonth(),
      local.getDate() - 1,
    ).toISOString();

    expect(
      checklistEditPayload(stored, pickedDayBefore, {}).checklist_date,
    ).toBe(
      new Date(
        local.getFullYear(),
        local.getMonth(),
        local.getDate() - 1,
        local.getHours(),
        local.getMinutes(),
      ).toISOString(),
    );
  });

  it("sends no date when the field posted none", () => {
    expect(checklistEditPayload(stored, null, {})).not.toHaveProperty(
      "checklist_date",
    );
    expect(checklistEditPayload(stored, "", {})).not.toHaveProperty(
      "checklist_date",
    );
  });

  it("keeps Salvar off until something differs", () => {
    const open = checklistEditOriginalValues({
      ...stored,
      tires_condition: "good",
    });

    expect(isChecklistEditDirty(open, { ...open })).toBe(false);
    expect(
      isChecklistEditDirty(open, { ...open, current_mileage: 15_000 }),
    ).toBe(false);
    expect(
      isChecklistEditDirty(open, { ...open, checklist_date: pickedSameDay }),
    ).toBe(false);
    expect(isChecklistEditDirty(open, { ...open, notes: "Pneu trocado" })).toBe(
      true,
    );
    expect(
      isChecklistEditDirty(open, { ...open, current_mileage: "15100" }),
    ).toBe(true);
  });
});

describe("the vehicle form's dates, in the machine's zone", () => {
  it("does not send a date whose day was picked again", () => {
    // Stored with a time (an API client's instant): the picker gives local
    // midnight of the same day. Red before: compared as instants, it was
    // sent as a change.
    const vehicle = {
      id: VEHICLE,
      description: "Caminhão",
      license_plate: "ABC1D23",
      brand: "Marca",
      model: "Modelo",
      acquisition_date: "2026-09-17T17:32:00.000Z",
      last_maintenance_date: null,
      fleet_type: "OWNED",
      current_mileage: 1000,
      maintenance_interval_km: 10000,
      maintenance_interval_months: 6,
      renavam: "12345678901",
      manufacturing_year: "2025-01-01T00:00:00.000Z",
      model_year: "2026-01-01T00:00:00.000Z",
      number_of_axles: 2,
      status: "ACTIVE",
    } as unknown as VehicleRow;

    const initial = {
      values: vehicleFormValues(vehicle),
      relations: vehicleRelations(vehicle),
    };
    const local = new Date("2026-09-17T17:32:00.000Z");
    const sameDay = new Date(
      local.getFullYear(),
      local.getMonth(),
      local.getDate(),
    ).toISOString();
    const dayBefore = new Date(
      local.getFullYear(),
      local.getMonth(),
      local.getDate() - 1,
    ).toISOString();

    expect(
      vehicleEditPayload(initial, {
        ...initial,
        values: { ...initial.values, acquisition_date: sameDay },
      }),
    ).toEqual({});
    expect(
      vehicleEditPayload(initial, {
        ...initial,
        values: { ...initial.values, acquisition_date: dayBefore },
      }),
    ).toEqual({ acquisition_date: dayBefore });
  });
});
