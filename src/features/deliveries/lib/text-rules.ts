import { z } from "zod";

/**
 * Free-text rules for MULTILINE fields (decision 5.5), mirrored from the API's
 * src/shared/delivery/text-rules.ts and the app's schemas/text-rules.ts.
 *
 * A line break never counts as a space: "Portão azul.\n\nTocar o 2" is two
 * paragraphs. Spaces and tabs may not repeat, and no line may start or end
 * with one. `\r` is part of a break because a textarea posts CRLF.
 */
const INLINE_WHITESPACE_RUN = /[^\S\r\n]{2,}/;
const INLINE_WHITESPACE_AT_LINE_EDGE = /^[^\S\r\n]|[^\S\r\n]$/;

function hasInlineConsecutiveSpaces(value: string): boolean {
  return INLINE_WHITESPACE_RUN.test(value);
}

function hasSpaceAtLineEdges(value: string): boolean {
  return value
    .split(/\r?\n/)
    .some((line) => INLINE_WHITESPACE_AT_LINE_EDGE.test(line));
}

/** The API's optionalMultilineText: same messages, same order. */
function optionalMultilineText(label: string, max: number) {
  return z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .max(max, `${label} deve ter no máximo ${max} caracteres.`)
      .superRefine((value, ctx) => {
        if (value.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não pode conter apenas espaços.`,
          });

          return;
        }

        if (hasInlineConsecutiveSpaces(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não deve conter espaços consecutivos.`,
          });

          return;
        }

        if (value !== value.trim() || hasSpaceAtLineEdges(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não pode começar ou terminar com espaço em branco.`,
          });
        }
      })
      .nullable()
      .optional(),
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A civil date as the API takes it: "YYYY-MM-DD" (decision 1.3). The date-only
 * picker emits exactly that; anything else is refused with the API's words.
 */
function optionalDateOnly(label: string) {
  return z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .refine(
        (value) => DATE_ONLY.test(value),
        `${label} deve estar no formato AAAA-MM-DD.`,
      )
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);

        // 2026-02-30 is not a day; Date would roll it into March.
        return (
          !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
        );
      }, `${label} não é uma data válida.`)
      .nullable()
      .optional(),
  );
}

export {
  hasInlineConsecutiveSpaces,
  hasSpaceAtLineEdges,
  optionalDateOnly,
  optionalMultilineText,
};
