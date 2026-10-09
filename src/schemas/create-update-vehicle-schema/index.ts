import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
  isValidDateString,
} from "@/lib/format-values";

/**
 * The vehicle form's fields, mirrored from the API
 * (trajetto-api/src/schemas/create-vehicle-schema): one definition for create
 * and edit (FLEET-VEH-2). The edit is the same object made partial, because
 * the form sends only what changed.
 *
 * FormData carries strings: numbers are parsed here (with a decimal comma),
 * and a picked year ("2027") becomes 1 January of that year.
 */

interface TextMessages {
  min: string;
  max: string;
  empty: string;
  consecutive: string;
  edges: string;
}

function plainText(min: number, max: number, messages: TextMessages) {
  // One check at a time, emptiness first: an empty or blank field is a
  // missing value, never "mínimo de N caracteres" (decision 16.702).
  return z.string().superRefine((value, ctx) => {
    const message = isEmptyOrWhitespace(value)
      ? messages.empty
      : value.length < min
        ? messages.min
        : value.length > max
          ? messages.max
          : hasConsecutiveSpaces(value)
            ? messages.consecutive
            : hasSpaceAtEdges(value)
              ? messages.edges
              : null;

    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  });
}

/** "2,5" and "2.5" alike; an empty field is absent. */
function numberFrom(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.trim() === "") return undefined;

  return Number(value.replace(",", "."));
}

function hasAtMostDecimals(value: number, places: number): boolean {
  const scaled = value * 10 ** places;

  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

function yearOfValue(value: string): number {
  return new Date(value).getUTCFullYear();
}

/** A year picked alone ("2027") is stored as 1 January of it. */
function yearValue(value: unknown): unknown {
  return typeof value === "string" && /^\d{4}$/.test(value.trim())
    ? `${value.trim()}-01-01`
    : value;
}

/** A select still on its placeholder: a question open, not a wrong answer. */
function isUnset(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

const PLATE_PATTERN = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

const vehicleFieldsSchema = z.object({
  description: plainText(3, 100, {
    min: "A descrição deve ter no mínimo 3 caracteres.",
    max: "A descrição deve ter no máximo 100 caracteres.",
    empty: "A descrição é obrigatória.",
    consecutive: "A descrição não deve conter espaços consecutivos.",
    edges: "A descrição não pode começar ou terminar com espaço em branco.",
  }),
  license_plate: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z
      .string({ required_error: "A placa é obrigatória." })
      .min(1, "A placa é obrigatória.")
      .length(7, "A placa deve ter 7 caracteres.")
      .regex(
        PLATE_PATTERN,
        "A placa deve estar no formato ABC1234 ou ABC1D23.",
      ),
  ),
  brand: plainText(2, 50, {
    min: "A marca deve ter no mínimo 2 caracteres.",
    max: "A marca deve ter no máximo 50 caracteres.",
    empty: "A marca é obrigatória.",
    consecutive: "A marca não deve conter espaços consecutivos.",
    edges: "A marca não pode começar ou terminar com espaço em branco.",
  }),
  model: plainText(2, 50, {
    min: "O modelo deve ter no mínimo 2 caracteres.",
    max: "O modelo deve ter no máximo 50 caracteres.",
    empty: "O modelo é obrigatório.",
    consecutive: "O modelo não deve conter espaços consecutivos.",
    edges: "O modelo não pode começar ou terminar com espaço em branco.",
  }),
  acquisition_date: z
    .string({ required_error: "A data de aquisição é obrigatória." })
    .min(1, "A data de aquisição é obrigatória.")
    .refine((value) => isValidDateString(value), "Data de aquisição inválida."),
  fleet_type: z.enum(["OWNED", "THIRD_PARTY"], {
    errorMap: (_issue, ctx) => ({
      message: isUnset(ctx.data)
        ? "Selecione o tipo de frota."
        : "Tipo de frota inválido. Deve ser Própria ou Terceirizada.",
    }),
  }),
  fleet_id: z.preprocess(
    emptyStringToNull,
    plainText(1, 50, {
      min: "O identificador da frota não pode ser vazio.",
      max: "O identificador da frota deve ter no máximo 50 caracteres.",
      empty: "O identificador da frota não pode conter apenas espaços.",
      consecutive:
        "O identificador da frota não deve conter espaços consecutivos.",
      edges:
        "O identificador da frota não pode começar ou terminar com espaço em branco.",
    })
      .nullable()
      .optional(),
  ),
  last_maintenance_date: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .refine(
        (value) => isValidDateString(value),
        "Data da última manutenção inválida.",
      )
      .nullable()
      .optional(),
  ),
  current_mileage: z.preprocess(
    numberFrom,
    z
      .number({
        required_error: "A quilometragem atual é obrigatória.",
        invalid_type_error: "A quilometragem atual deve ser um número válido.",
      })
      .min(0.1, "A quilometragem atual deve ser maior que zero.")
      .max(9999999, "A quilometragem atual não pode exceder 9.999.999 km."),
  ),
  last_maintenance_mileage: z.preprocess(
    (value) => (value === "" ? null : numberFrom(value)),
    z
      .number({
        invalid_type_error:
          "A quilometragem da última revisão deve ser um número válido.",
      })
      .min(0.1, "A quilometragem da última revisão deve ser maior que zero.")
      .max(
        9999999,
        "A quilometragem da última revisão não pode exceder 9.999.999 km.",
      )
      .nullable()
      .optional(),
  ),
  maintenance_interval_km: z.preprocess(
    numberFrom,
    z
      .number({
        required_error: "O intervalo de revisão em km é obrigatório.",
        invalid_type_error:
          "O intervalo de revisão em km deve ser um número válido.",
      })
      .min(0.1, "O intervalo de revisão em km deve ser maior que zero.")
      .max(100000, "O intervalo de revisão não pode exceder 100.000 km."),
  ),
  maintenance_interval_months: z.preprocess(
    numberFrom,
    z
      .number({
        required_error: "O intervalo de manutenção em meses é obrigatório.",
        invalid_type_error:
          "O intervalo de manutenção deve ser um número inteiro de meses.",
      })
      .int("O intervalo de manutenção deve ser um número inteiro de meses.")
      .min(1, "O intervalo de manutenção deve ser no mínimo de 1 mês.")
      .max(60, "O intervalo de manutenção não pode exceder 60 meses (5 anos)."),
  ),
  renavam: z
    .string({ required_error: "O RENAVAM é obrigatório." })
    .min(1, "O RENAVAM é obrigatório.")
    .length(11, "O RENAVAM deve ter exatamente 11 dígitos.")
    .regex(/^\d+$/, "O RENAVAM deve conter apenas números."),
  manufacturing_year: z.preprocess(
    yearValue,
    z
      .string({ required_error: "O ano de fabricação é obrigatório." })
      .min(1, "O ano de fabricação é obrigatório.")
      .refine(
        (value) => isValidDateString(value),
        "Ano de fabricação inválido.",
      )
      .refine(
        (value) => yearOfValue(value) <= new Date().getUTCFullYear(),
        "O ano de fabricação não pode ser posterior ao ano atual.",
      ),
  ),
  model_year: z.preprocess(
    yearValue,
    z
      .string({ required_error: "O ano do modelo é obrigatório." })
      .min(1, "O ano do modelo é obrigatório.")
      .refine((value) => isValidDateString(value), "Ano do modelo inválido.")
      .refine(
        (value) => yearOfValue(value) <= new Date().getUTCFullYear() + 1,
        "O ano do modelo pode ser no máximo o do ano que vem.",
      ),
  ),
  // Fractional since decision 8.6: a truck does 2,5–4 km/l.
  km_per_liter: z.preprocess(
    numberFrom,
    z
      .number({
        required_error: "O consumo em km/l é obrigatório.",
        invalid_type_error: "O consumo em km/l deve ser um número válido.",
      })
      .min(0.1, "O consumo deve ser de no mínimo 0,1 km/l.")
      .max(50, "O consumo não pode exceder 50 km/l.")
      .refine(
        (value) => hasAtMostDecimals(value, 2),
        "O consumo aceita no máximo duas casas decimais.",
      ),
  ),
  number_of_axles: z.preprocess(
    numberFrom,
    z
      .number({
        required_error: "O número de eixos é obrigatório.",
        invalid_type_error: "O número de eixos deve ser um número inteiro.",
      })
      .int("O número de eixos deve ser um número inteiro.")
      .min(1, "O número de eixos deve ser no mínimo 1.")
      .max(10, "O número de eixos não pode exceder 10."),
  ),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"], {
    errorMap: (_issue, ctx) => ({
      message: isUnset(ctx.data)
        ? "Selecione o status do veículo."
        : "Status inválido. Deve ser Ativo, Inativo ou Bloqueado.",
    }),
  }),
  vehicleTypeId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .uuid("O ID do tipo de veículo deve ser um UUID válido.")
      .nullable()
      .optional(),
  ),
  fuelTypeId: z
    .string({ required_error: "O tipo de combustível é obrigatório." })
    .uuid("O ID do tipo de combustível deve ser um UUID válido."),
  driverId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .uuid("O ID do motorista deve ser um UUID válido.")
      .nullable()
      .optional(),
  ),
  branchId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .uuid("O ID da filial deve ser um UUID válido.")
      .nullable()
      .optional(),
  ),
});

interface CrossFieldData {
  manufacturing_year?: string;
  model_year?: string;
  current_mileage?: number;
  last_maintenance_mileage?: number | null;
}

/**
 * The rules between fields, as messages per field. Shared by the schema's
 * refine and the form's live rules, which must not wait for every other
 * field to be valid (an object refine only runs once they all are).
 */
function vehicleCrossFieldIssues(data: CrossFieldData): {
  model_year?: string;
  last_maintenance_mileage?: string;
} {
  const issues: { model_year?: string; last_maintenance_mileage?: string } = {};

  if (
    data.manufacturing_year &&
    data.model_year &&
    isValidDateString(data.manufacturing_year) &&
    isValidDateString(data.model_year)
  ) {
    const manufacturing = yearOfValue(data.manufacturing_year);
    const model = yearOfValue(data.model_year);

    if (model < manufacturing || model > manufacturing + 1) {
      issues.model_year =
        "O ano do modelo deve ser igual ao ano de fabricação ou no máximo um ano posterior.";
    }
  }

  if (
    typeof data.last_maintenance_mileage === "number" &&
    typeof data.current_mileage === "number" &&
    data.last_maintenance_mileage > data.current_mileage
  ) {
    issues.last_maintenance_mileage =
      "A quilometragem da última revisão não pode ser superior à quilometragem atual.";
  }

  return issues;
}

function checkCrossFields(data: CrossFieldData, ctx: z.RefinementCtx): void {
  for (const [field, message] of Object.entries(
    vehicleCrossFieldIssues(data),
  )) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
  }
}

const createVehicleSchema = vehicleFieldsSchema.superRefine(checkCrossFields);

/**
 * The edit: every field optional (only the changed ones are sent). IN_ROUTE
 * is never sent — the route owns it — so the status keeps the three a person
 * decides.
 */
const updateVehicleSchema = vehicleFieldsSchema
  .partial()
  .superRefine(checkCrossFields);

export {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleCrossFieldIssues,
  vehicleFieldsSchema,
};
