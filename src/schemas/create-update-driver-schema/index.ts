import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";

import {
  birthDateIssue,
  CNH_CATEGORIES,
  CNH_CATEGORY_NONE,
  cnhExpiryIssue,
} from "@/features/driver/lib/driver-rules";

/**
 * Today on the São Paulo calendar. The company's zone is not known here;
 * zones in Brazil differ by at most two hours, which neither the ten-year
 * bound nor an 18th birthday checked again by the API cares about.
 */
const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );

/** "", undefined and the form's "Não informada" all mean no value (null for the API). */
const blankToNull = (value: unknown) =>
  value === undefined ||
  value === CNH_CATEGORY_NONE ||
  (typeof value === "string" && value.trim() === "")
    ? null
    : value;

/** A select still on its placeholder: a question open, not a wrong answer. */
const isUnset = (value: unknown) =>
  value === undefined || value === null || value === "";

const createUpdateDriverSchema = z.object({
  name: z
    .string()
    // Empty or blank is a missing name, not a short one (decision 16.702).
    .min(1, "O nome é obrigatório.")
    .min(3, "O nome deve ter no mínimo 3 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (value.length > 0 && isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome é obrigatório.",
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
  // A civil day, sent as "YYYY-MM-DD" (decision 1.3); the age is counted on
  // civil days, as the API does (birthDateIssue mirrors it).
  birth_date: z
    .string()
    .min(1, "A data de nascimento é obrigatória.")
    .superRefine((value, ctx) => {
      const issue = birthDateIssue(value, todayKey());

      if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    }),
  cnh: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return val.replace(/\D/g, "");
      }
      return val;
    },
    z
      .string()
      .min(1, "O número da CNH é obrigatório.")
      .regex(/^\d{11}$/, "A CNH deve ter exatamente 11 dígitos."),
  ),
  // Optional: legacy drivers predate both (decision 8.5). Mirrors the API's
  // driver-cnh-fields, messages included.
  cnh_category: z.preprocess(
    blankToNull,
    z
      .enum(CNH_CATEGORIES, {
        errorMap: () => ({
          message: `A categoria da CNH deve ser uma destas: ${CNH_CATEGORIES.join(", ")}.`,
        }),
      })
      .nullable(),
  ),
  // A civil day, sent as "YYYY-MM-DD" (decision 1.3).
  cnh_expires_at: z.preprocess(
    blankToNull,
    z
      .string()
      .superRefine((value, ctx) => {
        const issue = cnhExpiryIssue(value, todayKey());

        if (issue)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
      })
      .nullable(),
  ),
  cpf: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return val.replace(/\D/g, "");
      }
      return val;
    },
    z
      .string()
      .min(1, "O CPF é obrigatório.")
      .length(11, "O CPF deve ter exatamente 11 dígitos.")
      .regex(/^\d{11}$/, "O CPF deve conter apenas números."),
  ),
  rg: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return val.replace(/\D/g, "");
      }
      return val;
    },
    z
      .string()
      .min(1, "O RG é obrigatório.")
      .length(9, "O RG deve ter exatamente 9 dígitos.")
      .regex(/^\d{9}$/, "O RG deve conter apenas números."),
  ),
  cep: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        // Remove all non-numeric characters
        return val.replace(/\D/g, "");
      }
      return val;
    },
    z
      .string()
      .min(1, "O CEP é obrigatório.")
      .length(8, "O CEP deve ter exatamente 8 dígitos.")
      .regex(/^\d{8}$/, "O CEP deve conter apenas números."),
  ),
  city: z
    .string()
    .min(1, "A cidade é obrigatória.")
    .min(2, "A cidade deve ter no mínimo 2 caracteres.")
    .max(100, "A cidade deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da cidade não pode ser vazio ou conter apenas espaços.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da cidade não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da cidade não pode começar ou terminar com espaço em branco.",
        });

        return;
      }

      if (!/^[\p{L}0-9]+(?:[ \-][\p{L}0-9]+)*$/u.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da cidade deve conter apenas letras (inclusive acentos), números, espaços e traços, sem outros caracteres.",
        });
      }
    }),
  uf: z
    .string()
    .min(1, "A UF é obrigatória.")
    .length(2, "UF deve ter exatamente 2 caracteres.")
    .toUpperCase()
    .superRefine((value, ctx) => {
      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O UF não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O UF não pode começar ou terminar com espaço em branco.",
        });

        return;
      }

      if (/[^A-Z]/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O UF deve conter apenas letras sem números, símbolos ou traços.",
        });
        return;
      }
    }),
  street: z
    .string()
    .min(1, "A rua é obrigatória.")
    .min(3, "O nome da rua deve ter no mínimo 3 caracteres.")
    .max(100, "O nome da rua deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da rua não pode ser vazio ou conter apenas espaços.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da rua não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da rua não pode começar ou terminar com espaço em branco.",
        });

        return;
      }

      if (!/^[\p{L}0-9]+(?:[ \-][\p{L}0-9]+)*$/u.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da rua deve conter apenas letras (inclusive acentos), números, espaços e traços, sem outros caracteres.",
        });
      }
    }),
  address_number: z
    .string()
    .min(1, "O número do endereço é obrigatório.")
    .max(10, "O número do endereço deve ter no máximo 10 caracteres.")
    .regex(
      /^\d+[A-Za-z]?$/,
      "O número do endereço deve conter apenas números e letras.",
    ),
  complement: z
    .string()
    .max(50, "O complemento deve ter no máximo 50 caracteres.")
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === "") {
        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do complemento não deve conter espaços consecutivos.",
        });
        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do complemento não pode começar ou terminar com espaço em branco.",
        });
        return;
      }

      if (!/^[\p{L}0-9]+(?:[ \-][\p{L}0-9]+)*$/u.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do complemento deve conter apenas letras (inclusive acentos), números, espaços e traços, sem outros caracteres.",
        });
      }
    }),
  status: z.enum(["ACTIVE", "INACTIVE"], {
    errorMap: (_issue, ctx) => ({
      message: isUnset(ctx.data)
        ? "Selecione o status do motorista."
        : "O status deve ser 'Ativo' ou 'Inativo'",
    }),
  }),
  contract_type: z.enum(["OWNED", "THIRD_PARTY"], {
    errorMap: (_issue, ctx) => ({
      message: isUnset(ctx.data)
        ? "Selecione o tipo de contrato."
        : "O tipo de contrato deve ser 'Próprio' ou 'Terceirizado'",
    }),
  }),
  branchId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .uuid("O ID da filial deve ser um UUID válido.")
      .nullable()
      .optional(),
  ),
});

export { createUpdateDriverSchema };
