import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";
import {
  hasInlineConsecutiveSpaces,
  hasSpaceAtLineEdges,
} from "@/features/deliveries/lib/text-rules";

import { QUOTE_LIMITS } from "./limits";

/**
 * Mirrors trajetto-api's createQuoteSchema, which validates the same payload
 * again: whatever passes here must pass there, or the person learns about it
 * only after the round trip (tests/unitaires/quote-schema-api-parity.test.ts
 * runs both on the same input).
 */

/**
 * A form post sends a textarea's line breaks as CRLF, whatever the browser
 * shows. Normalised to LF so one break is one character, as the field's
 * maxlength counts it, and the API receives the text the person typed.
 */
const normalizeLineBreaks = (value: unknown): unknown =>
  typeof value === "string" ? value.replace(/\r\n?/g, "\n") : value;

const quoteSchema = z.object({
  name: z.string().superRefine((value, ctx) => {
    // Missing is said as missing (decision 16.702); the API refuses the
    // same input, in its own words.
    if (value.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome é obrigatório.",
      });

      return;
    }

    if (value.length > QUOTE_LIMITS.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `O nome não deve exceder ${QUOTE_LIMITS.name} caracteres.`,
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

    if (!/^\S+ \S+(?: \S+)*$/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, insira o nome completo.",
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
  company: z
    .string()
    .min(1, "A empresa é obrigatória.")
    .max(
      QUOTE_LIMITS.company,
      `A empresa deve ter no máximo ${QUOTE_LIMITS.company} caracteres.`,
    )
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da empresa não pode ser vazio ou conter apenas espaços.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da empresa não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A empresa não pode começar ou terminar com espaço em branco.",
        });

        return;
      }

      if (!/^[\p{L}0-9]+(?:[ \-][\p{L}0-9]+)*$/u.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O empresa deve conter apenas letras (inclusive acentos), números, espaços e traços, sem outros caracteres.",
        });
      }
    }),
  email: z
    .string()
    .min(1, "O e-mail é obrigatório.")
    .email("O e-mail informado não é válido.")
    .max(
      QUOTE_LIMITS.email,
      `O e-mail deve ter no máximo ${QUOTE_LIMITS.email} caracteres.`,
    ),
  telephone: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return val.replace(/\D/g, "");
      }

      return val;
    },
    z
      .string()
      .min(1, "O telefone é obrigatório.")
      .regex(
        /^\d{10,11}$/,
        "O telefone deve conter 10 ou 11 dígitos numéricos incluindo o DDD.",
      ),
  ),
  fleet_size: z.enum(["1-5", "6-15", "16-30", "31-50", "51-100", "101+"], {
    errorMap: () => ({
      message: "Selecione o tamanho da sua frota.",
    }),
  }),
  message: z.preprocess(
    (value) => emptyStringToNull(normalizeLineBreaks(value)),
    z
      .string()
      .max(
        QUOTE_LIMITS.message,
        `A mensagem deve ter no máximo ${QUOTE_LIMITS.message} caracteres.`,
      )
      .superRefine((value, ctx) => {
        if (isEmptyOrWhitespace(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A mensagem não pode ser vazia ou conter apenas espaços.",
          });

          return;
        }

        // The shared multiline rule (decision 5.5): a line break is not a
        // space, so a blank line between paragraphs passes, and no line
        // starts or ends with a space. The API applies the same rule.
        if (hasInlineConsecutiveSpaces(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A mensagem não deve conter espaços consecutivos.",
          });

          return;
        }

        if (hasSpaceAtEdges(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "A mensagem não pode começar ou terminar com espaço em branco.",
          });

          return;
        }

        if (hasSpaceAtLineEdges(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "As linhas da mensagem não podem começar ou terminar com espaço.",
          });
        }
      })
      .nullable()
      .optional(),
  ),
});

export { QUOTE_LIMITS, quoteSchema };
