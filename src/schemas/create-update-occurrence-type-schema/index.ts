import { z } from "zod";
import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";
import { occurrenceFormFieldsSchema } from "@/features/deliveries/occurrence-types/form-builder/rules";
import {
  OCCURRENCE_CATEGORIES,
  PAUSE_KINDS,
} from "@/features/deliveries/occurrence-types/category-rules";

const asBoolean = (val: unknown) =>
  typeof val === "string" ? val === "true" : val;

/** Mirrors the API's create/update occurrence type schema. */
const createUpdateOccurrenceTypeSchema = z.object({
  name: z
    .string()
    // Empty or blank is a missing name, not a short one (decision 16.702).
    .regex(/\S/, "O nome do tipo de ocorrência é obrigatório.")
    .min(2, "O nome do tipo de ocorrência deve ter no mínimo 2 caracteres.")
    .max(100, "O nome do tipo de ocorrência deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome do tipo de ocorrência é obrigatório.",
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
  // Decision 6.3: the driver's report waits for the tower.
  requires_authorization: z.preprocess(
    (val) => (typeof val === "string" ? val === "true" : val),
    z.boolean().optional(),
  ),
  // Decision 6.2: the builder posts the checked definition as JSON; "" is
  // "no form" (null clears it on an edit). Checked with the API's own rules.
  form_fields: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === "" || val === null) return null;

    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }

    return val;
  }, occurrenceFormFieldsSchema.nullable().optional()),
  // Decisions 14.3 and 14.4. The combination is checked by the dialog with
  // the API's category rules; the API checks it again against the stored type.
  category: z.enum(OCCURRENCE_CATEGORIES).optional(),
  requires_receipt_photo: z.preprocess(asBoolean, z.boolean().optional()),
  requires_signature: z.preprocess(asBoolean, z.boolean().optional()),
  pause_kind: z.preprocess(
    (val) => (val === "" ? null : val),
    z.enum(PAUSE_KINDS).nullable().optional(),
  ),
});

export { createUpdateOccurrenceTypeSchema };
