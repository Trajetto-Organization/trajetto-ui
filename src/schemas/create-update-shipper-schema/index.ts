import { z } from "zod";
import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";
import { isValidCnpj } from "@/features/deliveries/lib/cnpj";

/**
 * Mirrors the API's create/update shipper schema — the browser refuses the
 * same values the server would, so the user sees the message before the
 * round-trip. The server remains the enforcement point.
 */
const createUpdateShipperSchema = z.object({
  name: z
    .string()
    // Empty or blank is a missing name, not a short one (decision 16.702).
    .regex(/\S/, "O nome do embarcador é obrigatório.")
    .min(2, "O nome do embarcador deve ter no mínimo 2 caracteres.")
    .max(150, "O nome do embarcador deve ter no máximo 150 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome do embarcador é obrigatório.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome do embarcador não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do embarcador não pode começar ou terminar com espaço em branco.",
        });
      }
    }),
  cnpj: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const digits = val.replace(/\D/g, "");
        return digits === "" ? null : digits;
      }

      return val;
    },
    z
      .string()
      .length(14, "O CNPJ deve ter exatamente 14 dígitos.")
      .regex(/^\d{14}$/, "O CNPJ deve conter apenas números.")
      // Check digits, like the API (decision 5.7).
      .refine(isValidCnpj, "O CNPJ informado não é válido.")
      .nullable()
      .optional(),
  ),
  email: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .email("O e-mail informado não é válido.")
      .max(100, "O e-mail deve ter no máximo 100 caracteres.")
      .nullable()
      .optional(),
  ),
  telephone: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const digits = val.replace(/\D/g, "");
        return digits === "" ? null : digits;
      }

      return val;
    },
    z
      .string()
      .regex(
        /^\d{10,11}$/,
        "O telefone deve conter 10 ou 11 dígitos numéricos incluindo o DDD.",
      )
      .nullable()
      .optional(),
  ),
  is_active: z.preprocess(
    (val) => (typeof val === "string" ? val === "true" : val),
    z.boolean().optional(),
  ),
});

export { createUpdateShipperSchema };
