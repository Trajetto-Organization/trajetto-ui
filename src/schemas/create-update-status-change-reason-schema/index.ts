import { z } from "zod";
import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";

/**
 * Mirrors the API's create/update status-change-reason schema.
 *
 * Kept short on purpose: this is what appears in a picker and in a timeline
 * row, and a sentence there is a sentence nobody can group or count. The
 * detail belongs in the note the operator types at the moment of the change.
 */
const createUpdateStatusChangeReasonSchema = z.object({
  name: z
    .string()
    // Empty or blank is a missing name, not a short one (decision 16.702).
    .regex(/\S/, "O nome do motivo é obrigatório.")
    .min(2, "O nome do motivo deve ter no mínimo 2 caracteres.")
    .max(80, "O nome do motivo deve ter no máximo 80 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome do motivo é obrigatório.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome do motivo não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do motivo não pode começar ou terminar com espaço em branco.",
        });
      }
    }),

  description: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .max(255, "A descrição deve ter no máximo 255 caracteres.")
      .superRefine((value, ctx) => {
        if (hasConsecutiveSpaces(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A descrição não deve conter espaços consecutivos.",
          });

          return;
        }

        if (hasSpaceAtEdges(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "A descrição não pode começar ou terminar com espaço em branco.",
          });
        }
      })
      .nullable()
      .optional(),
  ),

  // Switches arrive as "true"/"false" strings from FormData.
  is_active: z.preprocess(
    (value) => (typeof value === "string" ? value === "true" : value),
    z.boolean().optional(),
  ),
});

export { createUpdateStatusChangeReasonSchema };
