import { z } from "zod";
import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";

const requiredTextField = (label: string, min: number, max: number) =>
  z
    .string()
    .min(min, `${label} deve ter no mínimo ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} não pode ser vazio ou conter apenas espaços.`,
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} não deve conter espaços consecutivos.`,
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} não pode começar ou terminar com espaço em branco.`,
        });
      }
    });

const optionalTextField = (label: string, max: number) =>
  z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .max(max, `${label} deve ter no máximo ${max} caracteres.`)
      .superRefine((value, ctx) => {
        if (hasConsecutiveSpaces(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não deve conter espaços consecutivos.`,
          });

          return;
        }

        if (hasSpaceAtEdges(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não pode começar ou terminar com espaço em branco.`,
          });
        }
      })
      .nullable()
      .optional(),
  );

const optionalDigits = (pattern: RegExp, message: string) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const digits = val.replace(/\D/g, "");
        return digits === "" ? null : digits;
      }

      return val;
    },
    z.string().regex(pattern, message).nullable().optional(),
  );

/** Numbers arrive as typed text ("45,237"), so the comma is the decimal. */
const decimalField = (label: string, max: number, allowZero: boolean) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return Number(val.replace(/\./g, "").replace(",", "."));
      }

      return val;
    },
    z
      .number({
        invalid_type_error: `${label} deve ser um número válido.`,
      })
      .max(max, `${label} excede o limite permitido.`)
      .refine((value) => (allowZero ? value >= 0 : value > 0), {
        message: allowZero
          ? `${label} não pode ser negativo.`
          : `${label} deve ser maior que zero.`,
      }),
  );

/**
 * One line of cargo. Mirrors the API's item schema so a malformed row is
 * refused in the browser with the same message the server would give.
 */
const deliveryItemSchema = z.object({
  description: requiredTextField("A descrição do item", 2, 200),
  quantity: decimalField("A quantidade", 999999, false),
  unit: optionalTextField("A unidade", 20),
  unit_value: decimalField("O valor unitário", 99999999, true).optional(),
});

const deliveryItemsSchema = z
  .array(deliveryItemSchema)
  .max(200, "Uma entrega não pode ter mais de 200 itens.");

/** Mirrors the API's create delivery schema (manual entry). */
const createUpdateDeliverySchema = z.object({
  shipperId: z.string().min(1, "O embarcador é obrigatório."),
  code: optionalTextField("O código do pedido", 60),
  invoice_key: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const digits = val.replace(/\D/g, "");
        return digits === "" ? null : digits;
      }

      return val;
    },
    z
      .string()
      .length(44, "A chave da NF-e deve ter exatamente 44 dígitos.")
      .regex(/^\d{44}$/, "A chave da NF-e deve conter apenas números.")
      .nullable()
      .optional(),
  ),
  recipient_name: requiredTextField("O nome do destinatário", 2, 150),
  recipient_document: optionalDigits(
    /^(\d{11}|\d{14})$/,
    "O documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos).",
  ),
  recipient_email: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .email("O e-mail do destinatário não é válido.")
      .max(100, "O e-mail deve ter no máximo 100 caracteres.")
      .nullable()
      .optional(),
  ),
  recipient_telephone: optionalDigits(
    /^\d{10,11}$/,
    "O telefone deve conter 10 ou 11 dígitos numéricos incluindo o DDD.",
  ),
  // Required, like every other address form in the app: the delivery address
  // is what the route is built from, and city/UF/street are only trustworthy
  // when they came from a CEP lookup. Imported NFe deliveries are the
  // exception and never pass through here — a note may legitimately omit it.
  cep: z.preprocess(
    (val) => (typeof val === "string" ? val.replace(/\D/g, "") : val),
    z
      .string()
      .length(8, "O CEP deve ter exatamente 8 dígitos.")
      .regex(/^\d{8}$/, "O CEP deve conter apenas números."),
  ),
  city: requiredTextField("A cidade", 2, 100),
  uf: z
    .string()
    .length(2, "UF deve ter exatamente 2 caracteres.")
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve conter apenas letras."),
  street: requiredTextField("A rua", 2, 150),
  address_number: optionalTextField("O número do endereço", 10),
  complement: optionalTextField("O complemento", 50),
  neighborhood: optionalTextField("O bairro", 100),
  scheduled_date: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  notes: optionalTextField("As observações", 500),
});

export {
  createUpdateDeliverySchema,
  deliveryItemSchema,
  deliveryItemsSchema,
};
