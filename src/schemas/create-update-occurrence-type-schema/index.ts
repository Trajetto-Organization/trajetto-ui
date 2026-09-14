import { z } from "zod";
import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";

/** Mirrors the API's create/update occurrence type schema. */
const createUpdateOccurrenceTypeSchema = z.object({
  name: z
    .string()
    .min(2, "O nome do tipo de ocorrência deve ter no mínimo 2 caracteres.")
    .max(100, "O nome do tipo de ocorrência deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do tipo de ocorrência não pode ser vazio ou conter apenas espaços.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do tipo de ocorrência não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do tipo de ocorrência não pode começar ou terminar com espaço em branco.",
        });
      }
    }),
  description: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .max(300, "A descrição deve ter no máximo 300 caracteres.")
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
  // Checkboxes and switches arrive as "true"/"false" strings from FormData.
  requires_photo: z.preprocess(
    (val) => (typeof val === "string" ? val === "true" : val),
    z.boolean().optional(),
  ),
  blocks_delivery: z.preprocess(
    (val) => (typeof val === "string" ? val === "true" : val),
    z.boolean().optional(),
  ),
  is_active: z.preprocess(
    (val) => (typeof val === "string" ? val === "true" : val),
    z.boolean().optional(),
  ),
});

export { createUpdateOccurrenceTypeSchema };
