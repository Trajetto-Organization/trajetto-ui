import { z } from "zod";
import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  parseCurrencyToNumber,
} from "@/lib/format-values";

const createUpdatePartSchema = z.object({
  description: z
    .string()
    // Empty or blank is a missing description, not a short one (16.702).
    .min(1, "A descrição é obrigatória.")
    .min(3, "A descrição deve ter no mínimo 3 caracteres.")
    .max(100, "A descrição deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (value.length > 0 && value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A descrição é obrigatória.",
        });

        return;
      }

      if (value.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome não deve exceder 100 caracteres.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome não pode começar ou terminar com espaço em branco.",
        });

        return;
      }

      const regex = /^(?=[\p{L}\p{N}])[ \p{L}\p{N}\p{P}]*(?<=[\p{L}\p{N}])$/u;
      if (!regex.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome deve começar e terminar com letra ou número; símbolos (ex.: @, _, -, .) só são permitidos no meio.",
        });
      }
    }),
  unit_price: z.preprocess(
    parseCurrencyToNumber,
    z
      .number({
        required_error: "O preço unitário é obrigatório.",
        invalid_type_error:
          "O preço unitário deve ser um valor numérico válido.",
      })
      .positive("O preço unitário deve ser maior que zero.")
      .max(999999.99, "O preço unitário não pode exceder 999.999,99."),
  ),
  supplierId: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return null;
      return val;
    },
    z.union([z.string().uuid("O fornecedor é obrigatório!."), z.null()]),
  ),
  businessId: z.string().min(1, "A empresa é obrigatória!"),
});

export { createUpdatePartSchema };
