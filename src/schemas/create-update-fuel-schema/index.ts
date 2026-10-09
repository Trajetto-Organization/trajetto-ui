import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
  isValidDateString,
  parseCurrencyToNumber,
} from "@/lib/format-values";

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
      // One message for zero or less: "maior que zero" says what to do.
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
      .min(0.01, "O preço por litro deve ser no mínimo R$ 0,01.")
      // Sanity cap (decision 15.9), mirrored from the API and the app.
      .max(50, "O preço por litro não pode exceder R$ 50,00."),
  ),
  notes: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .max(500, "As observações devem ter no máximo 500 caracteres.")
      .superRefine((value, ctx) => {
        if (!value || value === "") {
          return;
        }

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
      })
      .optional()
      .nullable(),
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

      // "Not in the future" is the company's calendar (decision 1.2): this
      // runs in the Server Action, on a UTC container, where the end of the
      // day falls at 21:00 in São Paulo. The picker already offers no future
      // day, and the API checks it in the company's zone.
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

/**
 * The edit posts only the links the person changed (FLEET-FUEL-1): a link
 * that is absent stays as it is on the server.
 */
const updateFuelFormSchema = createUpdateFuelSchema.partial({
  vehicleId: true,
  driverId: true,
  fuelTypeId: true,
  branchId: true,
});

export { createUpdateFuelSchema, updateFuelFormSchema };
