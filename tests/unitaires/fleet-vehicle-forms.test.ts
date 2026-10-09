import { describe, expect, it, vi } from "vitest";

import { createElement } from "react";
import { renderHtml } from "./helpers/render-html";

// The fields component draws radix selects; what matters here is which
// options the status select is given, so the select records its props.
const selects: Array<{
  name: string;
  options: Array<{ value: string; disabled?: boolean }>;
}> = [];

vi.mock("@/app/(protected)/_components/shared/custom/select-field", () => ({
  SelectField: (props: {
    name: string;
    options: Array<{ value: string; disabled?: boolean }>;
  }) => {
    selects.push({ name: props.name, options: props.options });
    return null;
  },
}));

vi.mock(
  "@/app/(protected)/_components/shared/custom/date-picker-field",
  () => ({
    DatePickerField: () => null,
  }),
);

vi.mock("@/components/shared/custom/form-input", () => ({
  default: () => null,
}));

import { VehicleFields } from "@/features/vehicle/form-dialog/fields";

import {
  axlesAfterTypeChange,
  changedVehicleFields,
  EMPTY_FORM,
  vehicleEditPayload,
  vehicleFormValues,
  vehicleRelations,
  yearOptions,
  yearToDateString,
} from "@/features/vehicle/lib/form-values";
import {
  createVehicleSchema,
  updateVehicleSchema,
} from "@/schemas/create-update-vehicle-schema";
import {
  vehicleTypeEditPayload,
  vehicleTypeFormValues,
} from "@/features/vehicle-type/lib/form";
import { updateVehicleTypeSchema } from "@/schemas/create-update-vehicle-type-schema";

import type { VehicleRow } from "@/features/vehicle/types";

const THIS_YEAR = new Date().getFullYear();

const truck: VehicleRow = {
  id: "018f0000-0000-7000-8000-0000000000c1",
  description: "Caminhão baú",
  license_plate: "ABC1D23",
  brand: "Volvo",
  model: "FH",
  acquisition_date: "2024-03-10T03:00:00.000Z",
  fleet_type: "OWNED",
  fleet_id: null,
  last_maintenance_date: null,
  current_mileage: 120000,
  last_maintenance_mileage: null,
  maintenance_interval_km: 10000,
  maintenance_interval_months: 6,
  renavam: "12345678901",
  manufacturing_year: "2024-01-01T00:00:00.000Z",
  model_year: "2025-01-01T00:00:00.000Z",
  km_per_liter: 2.5,
  number_of_axles: 1,
  status: "IN_ROUTE",
  vehicleTypeId: null,
  fuelTypeId: "018f0000-0000-7000-8000-0000000000f1",
  driverId: null,
  branchId: null,
  businessId: "018f0000-0000-7000-8000-00000000000b",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("the vehicle edit sends only what changed (FLEET-VEH-2, VEH-8)", () => {
  const initial = {
    values: vehicleFormValues(truck),
    relations: vehicleRelations(truck),
  };

  it("sends nothing when nothing changed, so Salvar stays disabled", () => {
    expect(vehicleEditPayload(initial, initial)).toEqual({});
  });

  it("sends the description alone on a one-axle truck", () => {
    // The full resend used to include number_of_axles: 1, which the old
    // update refused; and the odometer read when the dialog opened, which
    // a refuelling since then had already moved.
    const payload = vehicleEditPayload(initial, {
      values: { ...initial.values, description: "Baú refrigerado" },
      relations: initial.relations,
    });

    expect(payload).toEqual({ description: "Baú refrigerado" });
    expect(payload).not.toHaveProperty("current_mileage");
  });

  it("treats 2,5 and 2.5, and a plate's case, as no change", () => {
    expect(
      changedVehicleFields(initial.values, {
        ...initial.values,
        km_per_liter: "2,5",
        license_plate: "abc1d23",
      }),
    ).toEqual([]);
  });

  it("sends a cleared driver as an empty value the API reads as none", () => {
    const withDriver = {
      values: initial.values,
      relations: {
        ...initial.relations,
        driverId: "018f0000-0000-7000-8000-0000000000d1",
      },
    };

    expect(
      vehicleEditPayload(withDriver, {
        values: withDriver.values,
        relations: { ...withDriver.relations, driverId: "" },
      }),
    ).toEqual({ driverId: "" });
  });

  it("opens with the years alone, read in UTC", () => {
    expect(initial.values.manufacturing_year).toBe("2024");
    expect(initial.values.model_year).toBe("2025");
  });
});

describe("years (FLEET-VEH-3)", () => {
  it("offers next year's model and caps fabrication at this year", () => {
    expect(yearOptions("model")[0]).toBe(String(THIS_YEAR + 1));
    expect(yearOptions("manufacturing")[0]).toBe(String(THIS_YEAR));
  });

  it("stores a picked year as 1 January", () => {
    expect(yearToDateString("2027")).toBe("2027-01-01");
  });

  it("lets the web schema accept a 2026/2027 truck and refuse a future fabrication", () => {
    const result = createVehicleSchema.safeParse({
      ...EMPTY_FORM,
      description: "Caminhão novo",
      license_plate: "abc1d23",
      brand: "Scania",
      model: "R450",
      acquisition_date: "2026-01-10",
      fleet_type: "OWNED",
      current_mileage: "10",
      maintenance_interval_km: "10000",
      maintenance_interval_months: "6",
      renavam: "12345678901",
      manufacturing_year: String(THIS_YEAR),
      model_year: String(THIS_YEAR + 1),
      km_per_liter: "2,5",
      number_of_axles: "3",
      status: "ACTIVE",
      fuelTypeId: truck.fuelTypeId,
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.license_plate).toBe("ABC1D23");
    expect(result.success && result.data.km_per_liter).toBe(2.5);
    expect(result.success && result.data.model_year).toBe(
      `${THIS_YEAR + 1}-01-01`,
    );

    expect(
      updateVehicleSchema.safeParse({
        manufacturing_year: String(THIS_YEAR + 1),
      }).success,
    ).toBe(false);
  });

  it("parses an edit of one field without the others", () => {
    expect(
      updateVehicleSchema.parse({ description: "Baú refrigerado" }),
    ).toEqual({
      description: "Baú refrigerado",
    });
  });
});

describe("the type's axles fill the vehicle's (FLEET-VTYPE-3)", () => {
  it("prefills until the person types their own", () => {
    expect(
      axlesAfterTypeChange({
        currentAxles: "",
        typeAxles: 3,
        axlesEditedByHand: false,
      }),
    ).toBe("3");
    expect(
      axlesAfterTypeChange({
        currentAxles: "2",
        typeAxles: 3,
        axlesEditedByHand: true,
      }),
    ).toBe("2");
    expect(
      axlesAfterTypeChange({
        currentAxles: "2",
        typeAxles: undefined,
        axlesEditedByHand: false,
      }),
    ).toBe("2");
  });
});

describe("the status select of the edit (FLEET-VEH-4, FLEET-ASSIGN-5)", () => {
  function statusOptions(
    values: ReturnType<typeof vehicleFormValues>,
    persisted?: VehicleRow["status"],
  ) {
    selects.length = 0;

    renderHtml(
      createElement(VehicleFields, {
        values,
        onChange: () => undefined,
        disabled: false,
        persistedStatus: persisted,
        mileageLocked: true,
      }),
    );

    return selects.find((select) => select.name === "status")?.options ?? [];
  }

  it("keeps “Em rota” offered after the person picks BLOCKED on a truck that is out", () => {
    // The options used to be derived from the form's own value: picking a
    // status made "Em rota" vanish, with no way back.
    const options = statusOptions(
      { ...vehicleFormValues(truck), status: "BLOCKED" },
      "IN_ROUTE",
    );

    expect(options.map((option) => option.value)).toEqual([
      "IN_ROUTE",
      "BLOCKED",
    ]);
    expect(
      options.find((option) => option.value === "IN_ROUTE")?.disabled,
    ).toBe(true);
  });

  it("offers the three states a person decides on a vehicle in the yard", () => {
    const options = statusOptions(
      { ...vehicleFormValues(truck), status: "ACTIVE" },
      "ACTIVE",
    );

    expect(options.map((option) => option.value)).toEqual([
      "ACTIVE",
      "INACTIVE",
      "BLOCKED",
    ]);
  });

  it("offers the model year up to next year", () => {
    statusOptions(vehicleFormValues(truck), "ACTIVE");

    const modelYears =
      selects.find((select) => select.name === "model_year")?.options ?? [];

    expect(modelYears[0]?.value).toBe(String(THIS_YEAR + 1));
  });
});

describe("the vehicle-type edit (decision 8.5)", () => {
  const type = {
    id: "t1",
    description: "Truck",
    number_of_axles: 3,
    required_cnh_category: "C" as const,
    businessId: "b1",
    created_at: "",
    updated_at: "",
  };

  it("sends only the changed category, and an empty one to clear it", () => {
    const initial = vehicleTypeFormValues(type);

    expect(vehicleTypeEditPayload(initial, initial)).toEqual({});
    expect(
      vehicleTypeEditPayload(initial, {
        ...initial,
        required_cnh_category: "",
      }),
    ).toEqual({ required_cnh_category: "" });
    expect(
      updateVehicleTypeSchema.parse({ required_cnh_category: "" }),
    ).toEqual({
      required_cnh_category: null,
    });
  });

  it("refuses a licence class that does not exist", () => {
    expect(
      updateVehicleTypeSchema.safeParse({ required_cnh_category: "F" }).success,
    ).toBe(false);
  });
});
