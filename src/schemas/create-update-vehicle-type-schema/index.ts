import { z } from "zod";
import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";

/**
 * Mirrors trajetto-api/src/schemas/create-vehicle-type-schema: the name, the
 * default axles and the licence category a driver needs (decision 8.5).
 */
const CNH_CATEGORIES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "AB",
  "AC",
  "AD",
  "AE",
] as const;

type CnhCategory = (typeof CNH_CATEGORIES)[number];

const vehicleTypeFieldsSchema = z.object({
  description: z
    .string({ required_error: "O nome é obrigatório." })
    // Empty or only spaces is a missing name, not a length or spacing
    // mistake (decision 16.702).
    .min(1, "O nome é obrigatório.")
    .min(3, "O nome deve ter no mínimo 3 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (value.length > 0 && value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome é obrigatório.",
        });
        return;
      }

      const message = hasConsecutiveSpaces(value)
        ? "O nome não deve conter espaços consecutivos."
        : hasSpaceAtEdges(value)
          ? "O nome não pode começar ou terminar com espaço em branco."
          : !/^(?=[\p{L}\p{N}])[ \p{L}\p{N}\p{P}]*(?<=[\p{L}\p{N}])$/u.test(
                value,
              )
            ? "O nome deve começar e terminar com letra ou número; símbolos (ex.: @, _, -, .) só são permitidos no meio."
            : null;

      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }),
  number_of_axles: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim() === ""
          ? undefined
          : Number(value)
        : value,
    z
      .number({
        required_error: "O número de eixos é obrigatório.",
        invalid_type_error: "O número de eixos deve ser um número inteiro.",
      })
      .int("O número de eixos deve ser um número inteiro.")
      .min(1, "O número de eixos deve ser no mínimo 1.")
      .max(10, "O número de eixos deve ser no máximo 10."),
  ),
  // "" = not configured; the API stores null.
  required_cnh_category: z.preprocess(
    (value) => (value === "" || value === "NONE" ? null : value),
    z
      .enum(CNH_CATEGORIES, {
        errorMap: () => ({
          message:
            "Categoria de CNH inválida. Use A, B, C, D, E, AB, AC, AD ou AE.",
        }),
      })
      .nullable()
      .optional(),
  ),
});

const createVehicleTypeSchema = vehicleTypeFieldsSchema;

/** The edit sends only what changed. */
const updateVehicleTypeSchema = vehicleTypeFieldsSchema.partial();

export {
  CNH_CATEGORIES,
  createVehicleTypeSchema,
  updateVehicleTypeSchema,
  vehicleTypeFieldsSchema,
};
export type { CnhCategory };
