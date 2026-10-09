import { describe, expect, it } from "vitest";

import { createFieldValidator } from "@/components/shared/live-validation";
import {
  vehicleFormRules,
  vehicleFormSchema,
  EMPTY_FORM,
} from "@/features/vehicle/lib/form-values";
import {
  fineDateIssues,
  fineFormSchema,
  liveTodayKey,
} from "@/features/fine/lib/fine-form-schema";
import {
  fuelMileageNote,
  fuelSchemaValues,
  odometerPhotoIssue,
} from "@/features/fuel/lib/live-rules";
import { mileageRefusalMessage } from "@/features/service-order/lib/service-order-rules";
import {
  accountPayableLiveIssues,
  createAccountPayableSchema,
} from "@/schemas/create-update-account-payable-schema";
import {
  createUpdateServiceOrderSchema,
  serviceOrderLiveIssues,
} from "@/schemas/create-update-service-order-schema";
import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import { vehicleFieldsSchema } from "@/schemas/create-update-vehicle-schema";
import { vehicleTypeFieldsSchema } from "@/schemas/create-update-vehicle-type-schema";
import { createUpdateSupplierSchema } from "@/schemas/create-update-supplier-schema";
import { createUpdatePartSchema } from "@/schemas/create-update-part-schema";
import { createUpdateDriverSchema } from "@/schemas/create-update-driver-schema";
import { createUpdateFuelTypeSchema } from "@/schemas/create-update-fuel-type-schema";
import { createKanbanCardSchema } from "@/schemas/create-kanban-card-schema";

/**
 * The rules behind the fleet forms' live validation (decision 16.700): the
 * cross-field ones that must not wait for the whole form, the data the
 * client knows, and the "what is missing" wording (decision 16.702).
 */

const firstMessage = (
  schema: { safeParse: (value: unknown) => any },
  value: unknown,
) => schema.safeParse(value).error?.issues[0]?.message ?? null;

describe("empty values say what is missing", () => {
  it.each([
    [
      "vehicle description",
      vehicleFieldsSchema.shape.description,
      "",
      "A descrição é obrigatória.",
    ],
    [
      "vehicle description of spaces",
      vehicleFieldsSchema.shape.description,
      "   ",
      "A descrição é obrigatória.",
    ],
    [
      "vehicle plate",
      vehicleFieldsSchema.shape.license_plate,
      "",
      "A placa é obrigatória.",
    ],
    [
      "vehicle fleet type",
      vehicleFieldsSchema.shape.fleet_type,
      "",
      "Selecione o tipo de frota.",
    ],
    [
      "vehicle status",
      vehicleFieldsSchema.shape.status,
      "",
      "Selecione o status do veículo.",
    ],
    [
      "vehicle RENAVAM",
      vehicleFieldsSchema.shape.renavam,
      "",
      "O RENAVAM é obrigatório.",
    ],
    [
      "vehicle type name",
      vehicleTypeFieldsSchema.shape.description,
      "",
      "O nome é obrigatório.",
    ],
    [
      "vehicle type name of spaces",
      vehicleTypeFieldsSchema.shape.description,
      "   ",
      "O nome é obrigatório.",
    ],
    [
      "supplier name",
      createUpdateSupplierSchema.shape.name,
      "",
      "O nome do fornecedor é obrigatório.",
    ],
    [
      "supplier CNPJ",
      createUpdateSupplierSchema.shape.cnpj,
      "",
      "O CNPJ é obrigatório.",
    ],
    [
      "part description",
      createUpdatePartSchema.shape.description,
      "",
      "A descrição é obrigatória.",
    ],
    [
      "driver name",
      createUpdateDriverSchema.shape.name,
      "",
      "O nome é obrigatório.",
    ],
    [
      "driver CPF",
      createUpdateDriverSchema.shape.cpf,
      "",
      "O CPF é obrigatório.",
    ],
    [
      "driver status",
      createUpdateDriverSchema.shape.status,
      "",
      "Selecione o status do motorista.",
    ],
    [
      "driver contract",
      createUpdateDriverSchema.shape.contract_type,
      "",
      "Selecione o tipo de contrato.",
    ],
    [
      "driver city",
      createUpdateDriverSchema.shape.city,
      "",
      "A cidade é obrigatória.",
    ],
    [
      "fuel type",
      createUpdateFuelTypeSchema.shape.description,
      "",
      "Selecione o combustível.",
    ],
    [
      "card title of spaces",
      createKanbanCardSchema.shape.title,
      "   ",
      "O título do card é obrigatório.",
    ],
    [
      "refueling liters at zero",
      createUpdateFuelSchema.shape.liters_amount,
      "0",
      "A quantidade de litros deve ser maior que zero.",
    ],
  ])("%s", (_label, schema, value, message) => {
    // Red before: "mínimo de N caracteres", "inválido", "espaços consecutivos"
    // or "valor positivo" for a value that was simply missing.
    expect(firstMessage(schema, value)).toBe(message);
  });

  it("still refuses a wrong value with its own words", () => {
    expect(firstMessage(vehicleFieldsSchema.shape.fleet_type, "X")).toBe(
      "Tipo de frota inválido. Deve ser Própria ou Terceirizada.",
    );
    expect(firstMessage(vehicleFieldsSchema.shape.description, "Ca")).toBe(
      "A descrição deve ter no mínimo 3 caracteres.",
    );
  });
});

describe("the vehicle form's rules", () => {
  const values = {
    ...EMPTY_FORM,
    manufacturing_year: "2020",
    model_year: "2023",
  };

  it("says an incoherent model year without waiting for the other fields", () => {
    expect(vehicleFormRules(values, null).model_year).toBe(
      "O ano do modelo deve ser igual ao ano de fabricação ou no máximo um ano posterior.",
    );
  });

  it("judges a pair on edit only when one of its fields changed", () => {
    expect(vehicleFormRules(values, ["brand"]).model_year).toBeUndefined();
    expect(
      vehicleFormRules(values, ["manufacturing_year"]).model_year,
    ).toBeDefined();
  });

  it("refuses a revision mileage above the current one", () => {
    const rules = vehicleFormRules(
      {
        ...EMPTY_FORM,
        current_mileage: "1000",
        last_maintenance_mileage: "2000",
      },
      null,
    );

    expect(rules.last_maintenance_mileage).toContain("não pode ser superior");
  });

  it("checks on edit only the fields that are sent", () => {
    const validator = createFieldValidator({
      schema: vehicleFormSchema(["brand"]),
      values: { ...EMPTY_FORM, description: "a  b", brand: "Scania" },
    });

    expect(validator.fields).toEqual(["brand"]);
    expect(validator.messageOf("description")).toBeNull();
    expect(validator.messageOf("brand")).toBeNull();
  });
});

describe("the fine's date rules", () => {
  it("compare the dates without the amount or the points", () => {
    expect(
      fineDateIssues(
        { violation_date: "2026-09-10", due_date: "2026-09-01" },
        "2026-10-08",
      ),
    ).toEqual({
      due_date: "A data de vencimento deve ser posterior à data da infração.",
    });
  });

  it("leave a missing date to its own field", () => {
    expect(
      fineDateIssues(
        { violation_date: "", due_date: "2026-09-01" },
        "2026-10-08",
      ),
    ).toEqual({});
  });

  it("use the UTC day live, ahead of every Brazilian zone", () => {
    // 22:00 in São Paulo on the 8th is already the 9th in UTC: a violation on
    // the 9th, the company's day in a zone ahead of the browser, is not refused.
    expect(liveTodayKey(new Date("2026-10-09T01:00:00.000Z"))).toBe(
      "2026-10-09",
    );
  });

  it("are the same the action runs", () => {
    const result = fineFormSchema.safeParse({
      violation_date: "2026-09-10",
      due_date: "2026-09-01",
      amount: "100",
      points: "4",
      branchId: "018f0000-0000-7000-8000-0000000000a1",
      driverId: "018f0000-0000-7000-8000-0000000000a2",
      vehicleId: "018f0000-0000-7000-8000-0000000000a3",
      trafficViolationCodeId: "018f0000-0000-7000-8000-0000000000a4",
    });

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "due_date",
    ]);
  });
});

describe("the bill's rules between fields", () => {
  const empty = {
    category: "",
    category_description: "",
    payment_date: "",
    amount: "",
    amount_paid: "",
    supplierId: "",
    payee_name: "",
  };

  it("say a paid amount needs its date while everything else is empty", () => {
    // Red before: an object refine, which waits for every field.
    expect(
      accountPayableLiveIssues(
        { ...empty, amount_paid: "100" },
        { requirePayee: true },
      ).amount_paid,
    ).toContain("Se há data de pagamento");
  });

  it("ask for the category description with Outros and for a payee", () => {
    const issues = accountPayableLiveIssues(
      { ...empty, category: "OTHER" },
      { requirePayee: true },
    );

    expect(issues.category_description).toBe(
      'Descreva a categoria ao selecionar "Outros".',
    );
    expect(issues.payee_name).toBe(
      "Informe o favorecido: um fornecedor cadastrado ou um nome.",
    );
  });

  it("do not ask a legacy bill for a payee", () => {
    expect(
      accountPayableLiveIssues(empty, { requirePayee: false }).payee_name,
    ).toBeUndefined();
  });

  it("are the ones the action applies", () => {
    const result = createAccountPayableSchema.safeParse({
      category: "OTHER",
      due_date: "2026-10-10",
      amount: "100",
      amount_paid: "200",
      payment_date: "2026-10-01",
      branchId: "018f0000-0000-7000-8000-0000000000a1",
      registrationUserId: "018f0000-0000-7000-8000-0000000000a2",
      payee_name: "Posto",
    });

    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "amount_paid",
      "category_description",
    ]);
  });
});

describe("the service order's rules", () => {
  it("say a completion before the order without the rest of the form", () => {
    expect(
      serviceOrderLiveIssues({
        date: "2026-10-05T03:00:00.000Z",
        completion_date: "2026-10-02T03:00:00.000Z",
      }).completion_date,
    ).toBe(
      "A data de conclusão não pode ser anterior à data da ordem de serviço",
    );
  });

  it("ask for the new mileage when finishing", () => {
    expect(
      serviceOrderLiveIssues({
        date: "2026-10-01T03:00:00.000Z",
        completion_date: "2026-10-02T03:00:00.000Z",
      }).new_mileage_after_service,
    ).toBe(
      "A nova quilometragem é obrigatória quando a ordem de serviço é finalizada",
    );
  });

  it("keep the action's schema refusing the same", () => {
    const issues = createUpdateServiceOrderSchema.safeParse({
      date: "2026-10-05T03:00:00.000Z",
      completion_date: "2026-10-02T03:00:00.000Z",
      maintenance_type: "EXTERNAL",
      total_amount: "100",
      current_mileage_at_service: "1000",
      maintenance_interval_km_at_service: "1000",
      new_mileage_after_service: "1200",
      responsibleUserId: "018f0000-0000-7000-8000-0000000000a1",
      branchId: "018f0000-0000-7000-8000-0000000000a2",
    }).error?.issues;

    expect(issues?.map((issue) => issue.path[0])).toEqual(["completion_date"]);
  });

  it("word the mileage refusals with the km in pt-BR", () => {
    expect(
      mileageRefusalMessage("behind-opening", {
        floor: 44_000,
        currentMileage: 50_000,
      }),
    ).toBe(
      "A quilometragem corrigida não pode ser menor que 44.000 km (a do veículo na abertura da ordem).",
    );
    expect(
      mileageRefusalMessage(null, { floor: 0, currentMileage: 0 }),
    ).toBeNull();
  });
});

describe("the refueling's live rules", () => {
  it("read the numbers the form posts", () => {
    expect(
      fuelSchemaValues({
        refueling_date: "x",
        current_mileage: "15.234",
        liters_amount: "45,237",
        price_per_liter: "R$ 5,899",
        notes: "",
      }),
    ).toMatchObject({ current_mileage: "15234", liters_amount: "45.237" });
  });

  it("note a km at or below the vehicle's, never above it", () => {
    expect(fuelMileageNote("50.000", 50_000)).toContain(
      "Igual ou abaixo da atual do veículo (50.000 km)",
    );
    expect(fuelMileageNote("50.001", 50_000)).toBeNull();
    expect(fuelMileageNote("", 50_000)).toBeNull();
    expect(fuelMileageNote("10", undefined)).toBeNull();
  });

  it("ask for the photo only where the action does", () => {
    expect(
      odometerPhotoIssue({ photo: null, fileError: null, required: true }),
    ).toBe("A foto do odômetro é obrigatória.");
    expect(
      odometerPhotoIssue({ photo: null, fileError: null, required: false }),
    ).toBeNull();
    expect(
      odometerPhotoIssue({
        photo: {},
        fileError: "O arquivo deve ter no máximo 5MB.",
        required: true,
      }),
    ).toBe("O arquivo deve ter no máximo 5MB.");
  });
});
