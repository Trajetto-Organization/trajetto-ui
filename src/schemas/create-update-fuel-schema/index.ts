import { parseCurrencyToNumber } from "@/lib/format-values";
import { z } from "zod";

const hasSpaceAtEdges = (value: string) => /^\s|\s$/.test(value);
const isEmptyOrWhitespace = (value: string): boolean =>
  value.trim().length === 0;

const hasConsecutiveSpaces = (value: string): boolean => /\s{2,}/.test(value);

const emptyStringToNull = (value: any) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const isValidDateString = (value: string): boolean => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};

const createUpdateFuelSchema = z.object({
  current_mileage: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return parseFloat(val.replace(",", "."));
      }
      return val;
    },
    z
      .number({
        required_error: "A quilometragem atual do veículo é obrigatória.",
        invalid_type_error: "A quilometragem atual deve ser um número válido.",
      })
      .nonnegative("A quilometragem atual deve ser um valor não negativo.")
      .min(0.1, "A quilometragem atual deve ser maior que zero.")
      .max(9999999, "A quilometragem atual não pode exceder 9.999.999 km."),
  ),
  liters_amount: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return parseFloat(val.replace(",", "."));
      }
      return val;
    },
    z
      .number({
        required_error: "A quantidade de litros é obrigatória.",
        invalid_type_error: "A quantidade de litros deve ser um número válido.",
      })
      .positive("A quantidade de litros deve ser um valor positivo.")
      .min(0.001, "A quantidade de litros deve ser maior que zero.")
      .max(99999.999, "A quantidade de litros não pode exceder 99.999,999 L."),
  ),
  price_per_liter: z.preprocess(
    parseCurrencyToNumber,
    z
      .number({
        required_error: "O preço por litro é obrigatório.",
        invalid_type_error:
          "O preço por litro deve ser um valor numérico válido.",
      })
      .positive("O preço por litro deve ser um valor positivo.")
      .min(0.01, "O preço por litro deve ser no mínimo R$ 0,01")
      .max(999.99, "O preço por litro não pode exceder R$ 999,99."),
  ),
  notes: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .max(500, "As observações devem ter no máximo 500 caracteres.")
      .optional()
      .nullable()
      .superRefine((value, ctx) => {
        if (value && typeof value === "string") {
          if (isEmptyOrWhitespace(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "As observações não podem conter apenas espaços.",
            });
            return;
          }

          if (hasConsecutiveSpaces(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "As observações não devem conter espaços consecutivos.",
            });
            return;
          }

          if (hasSpaceAtEdges(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "As observações não podem começar ou terminar com espaço em branco.",
            });
            return;
          }
        }
      }),
  ),
  refueling_date: z
    .string()
    .min(1, "A data do abastecimento é obrigatória.")
    .superRefine((val, ctx) => {
      if (!isValidDateString(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data do abastecimento inválida.",
        });
        return;
      }

      // Validation: refueling date cannot be in the future
      const refuelingDate = new Date(val);
      const today = new Date();

      today.setHours(23, 59, 59, 999); // End of today

      if (refuelingDate > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A data do abastecimento não pode ser no futuro.",
        });
        return;
      }
    }),
  vehicleId: z.string().uuid("O ID do veículo deve ser um UUID válido."),
  driverId: z.string().uuid("O ID do motorista deve ser um UUID válido."),
  fuelTypeId: z
    .string()
    .uuid("O ID do tipo de combustível deve ser um UUID válido."),
  branchId: z.string().uuid("O ID da filial deve ser um UUID válido."),

  // 📍 GEOLOCATION: Final location (edited or original)
  latitude: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return null;
        return parseFloat(val);
      }

      return val;
    },
    z
      .number({
        invalid_type_error: "A latitude deve ser um número válido.",
      })
      .min(-90, "A latitude deve estar entre -90 e 90.")
      .max(90, "A latitude deve estar entre -90 e 90.")
      .optional()
      .nullable(),
  ),
  longitude: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return null;
        return parseFloat(val);
      }
      return val;
    },
    z
      .number({
        invalid_type_error: "A longitude deve ser um número válido.",
      })
      .min(-180, "A longitude deve estar entre -180 e 180.")
      .max(180, "A longitude deve estar entre -180 e 180.")
      .optional()
      .nullable(),
  ),
});

export { createUpdateFuelSchema };
