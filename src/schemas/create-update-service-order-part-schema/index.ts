import { z } from "zod";
import { parseCurrencyToNumber } from "@/lib/format-values";

// Helper to preprocess number inputs
const processNumberInput = (val: unknown) => {
  if (typeof val === "string") {
    if (val.trim() === "") return undefined;
    return Number(val.replace(",", "."));
  }

  return val;
};

const createUpdateServiceOrderPartSchema = z.object({
  unit_price: z.preprocess(
    parseCurrencyToNumber,
    z
      .number({
        required_error: "O preço unitário é obrigatório.",
        invalid_type_error:
          "O preço unitário deve ser um valor numérico válido.",
      })
      .positive("O preço unitário deve ser um valor positivo.")
      .max(999999.99, "O preço unitário não pode exceder 999.999,99."),
  ),
  quantity: z.preprocess(
    processNumberInput,
    z
      .number({
        required_error: "A quantidade é obrigatória.",
        invalid_type_error: "A quantidade deve ser um número inteiro válido.",
      })
      .int("A quantidade deve ser um número inteiro.")
      .positive("A quantidade deve ser um valor positivo.")
      .max(9999, "A quantidade não pode exceder 9.999."),
  ),
  discount_percentage: z.preprocess(
    (val) => {
      if (
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "")
      ) {
        return null;
      }
      if (typeof val === "string") {
        return Number(val.replace(",", "."));
      }
      return val;
    },
    z
      .number({
        invalid_type_error:
          "O percentual de desconto deve ser um número válido.",
      })
      .nonnegative("O percentual de desconto deve ser um valor não negativo.")
      .max(100, "O percentual de desconto não pode exceder 100%.")
      .nullable()
      .optional(),
  ),
  partId: z.string().uuid("O ID da peça deve ser um UUID válido."),
});

export { createUpdateServiceOrderPartSchema };
