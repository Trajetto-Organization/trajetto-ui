import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isValidDateString,
  parseCurrencyToNumber,
} from "@/lib/format-values";

/**
 * The bill's fields as the form sends them. Mirrors trajetto-api's
 * create-account-payable-schema: same limits, same messages.
 */
const ACCOUNT_PAYABLE_CATEGORIES = [
  "FUEL",
  "MAINTENANCE",
  "INSURANCE",
  "TAXES_FEES",
  "FINES",
  "TOLLS",
  "RENTAL",
  "PAYROLL",
  "OTHER",
] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A picked day ("YYYY-MM-DD"), the form's value since decision 8.4. */
function isValidBillDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return isValidDateString(value);

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // 2026-02-30 would roll over to March: a real day reads back the same.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** A single-line optional text: empty is absent, no edge or repeated spaces. */
function optionalLine(label: string, max: number) {
  return z.preprocess(
    emptyStringToNull,
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
      .optional()
      .nullable(),
  );
}

// Multiline (decision 5.5): a line break never counts as a space.
const INLINE_WHITESPACE_RUN = /[^\S\r\n]{2,}/;
const INLINE_WHITESPACE_AT_LINE_EDGE = /^[^\S\r\n]|[^\S\r\n]$/;

function optionalMultiline(label: string, max: number) {
  return z.preprocess(
    emptyStringToNull,
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

        if (INLINE_WHITESPACE_RUN.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não deve conter espaços consecutivos.`,
          });

          return;
        }

        if (
          value !== value.trim() ||
          value
            .split(/\r?\n/)
            .some((line) => INLINE_WHITESPACE_AT_LINE_EDGE.test(line))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não pode começar ou terminar com espaço em branco.`,
          });
        }
      })
      .optional()
      .nullable(),
  );
}

const optionalId = (message: string) =>
  z.preprocess(
    emptyStringToNull,
    z.string().uuid(message).optional().nullable(),
  );

const accountPayableFormObject = z.object({
  category: z.enum(ACCOUNT_PAYABLE_CATEGORIES, {
    errorMap: () => ({ message: "Selecione a categoria da conta." }),
  }),
  category_description: optionalLine("A descrição da categoria", 120),
  due_date: z
    .string()
    .min(1, "Data de vencimento é obrigatória.")
    .refine(isValidBillDate, "Data de vencimento inválida."),
  payment_date: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .refine(isValidBillDate, "Data de pagamento inválida.")
      .nullable()
      .optional(),
  ),
  amount: z.preprocess(
    parseCurrencyToNumber,
    z
      .number({
        required_error: "O valor é obrigatório.",
        invalid_type_error: "O valor deve ser um valor numérico válido.",
      })
      .nonnegative("O valor deve ser um valor não negativo.")
      .min(1, "O valor deve ser no mínimo R$ 1,00")
      .max(9999999.99, "O valor não pode exceder R$ 9.999.999,99."),
  ),
  amount_paid: z.preprocess(
    (val) => {
      if (typeof val === "string" && val.trim() === "") return null;

      if (val !== null && val !== undefined) return parseCurrencyToNumber(val);

      return val;
    },
    z
      .number({
        invalid_type_error: "O valor pago deve ser um valor numérico válido.",
      })
      .nonnegative("O valor pago deve ser um valor não negativo.")
      .min(1, "O valor pago deve ser no mínimo R$ 1,00")
      .max(9999999.99, "O valor pago não pode exceder R$ 9.999.999,99.")
      .optional()
      .nullable(),
  ),
  branchId: z
    .string({ required_error: "Selecione a filial." })
    .uuid("Selecione a filial."),
  serviceOrderId: optionalId(
    "O ID da ordem de serviço deve ser um UUID válido.",
  ),
  registrationUserId: z
    .string({ required_error: "Selecione o responsável." })
    .uuid("Selecione o responsável."),
  supplierId: optionalId("Selecione um fornecedor válido."),
  payee_name: optionalLine("O nome do favorecido", 120),
  vehicleId: optionalId("Selecione um veículo válido."),
  description: optionalMultiline("A descrição", 500),
  document_number: optionalLine("O número do documento", 60),
});

const PAYEE_REQUIRED_MESSAGE =
  "Informe o favorecido: um fornecedor cadastrado ou um nome.";

const PAYMENT_PAIR_MESSAGE =
  "Se há data de pagamento, deve haver valor pago e vice-versa. O valor pago não pode ser maior que o valor total.";

interface BillCrossData {
  category?: string | null;
  category_description?: string | null;
  payment_date?: string | null;
  amount?: number | null;
  amount_paid?: number | null;
  supplierId?: string | null;
  payee_name?: string | null;
}

/**
 * The rules between fields, per field: the schema's refines and the form's
 * live rules say the same thing. Live, they must not wait for every other
 * field to be valid (an object refine only runs once they all are).
 */
function accountPayableCrossIssues(
  data: BillCrossData,
  { requirePayee }: { requirePayee: boolean },
): {
  amount_paid?: string;
  category_description?: string;
  payee_name?: string;
} {
  const issues: {
    amount_paid?: string;
    category_description?: string;
    payee_name?: string;
  } = {};

  if (
    (data.payment_date && !data.amount_paid) ||
    (data.amount_paid && !data.payment_date) ||
    (data.amount_paid &&
      typeof data.amount === "number" &&
      data.amount_paid > data.amount)
  ) {
    issues.amount_paid = PAYMENT_PAIR_MESSAGE;
  }

  if (data.category === "OTHER" && !data.category_description) {
    issues.category_description =
      'Descreva a categoria ao selecionar "Outros".';
  }

  if (requirePayee && !data.supplierId && !data.payee_name) {
    issues.payee_name = PAYEE_REQUIRED_MESSAGE;
  } else if (data.supplierId && data.payee_name) {
    issues.payee_name =
      "Informe o fornecedor cadastrado ou o nome do favorecido, não os dois.";
  }

  return issues;
}

/**
 * The same rules on the form's raw values (strings as typed): each field is
 * read through its own schema, and one that does not parse is left to its
 * own message.
 */
function accountPayableLiveIssues(
  values: Record<string, string>,
  options: { requirePayee: boolean },
): {
  amount_paid?: string;
  category_description?: string;
  payee_name?: string;
} {
  const shape = accountPayableFormObject.shape;
  const read = <K extends keyof typeof shape>(field: K) => {
    const result = shape[field].safeParse(values[field]);
    return result.success ? (result.data as never) : undefined;
  };

  return accountPayableCrossIssues(
    {
      category: values.category,
      category_description: read("category_description"),
      payment_date: read("payment_date"),
      amount: read("amount"),
      amount_paid: read("amount_paid"),
      supplierId: read("supplierId"),
      payee_name: read("payee_name"),
    },
    options,
  );
}

/**
 * The bill form's rules. `requirePayee`: a new bill always names who is
 * paid (decision 8.4), and so does an edit of a bill that already names one
 * — the API refuses clearing it (ACCOUNT_PAYABLE_PAYEE_REQUIRED). A bill
 * from before the column is edited without inventing a payee: requiring it
 * blocked the most common edit, registering the payment.
 */
function accountPayableFormSchema({ requirePayee }: { requirePayee: boolean }) {
  return accountPayableFormObject.superRefine((data, ctx) => {
    const issues = accountPayableCrossIssues(data, { requirePayee });

    for (const [field, message] of Object.entries(issues)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  });
}

/** Creating: the payee is required. */
const createAccountPayableSchema = accountPayableFormSchema({
  requirePayee: true,
});

/**
 * Editing: the form says whether the bill already had a payee
 * (`payee_required`, read by the update action).
 */
function updateAccountPayableSchema(requirePayee: boolean) {
  return accountPayableFormSchema({ requirePayee });
}

export {
  ACCOUNT_PAYABLE_CATEGORIES,
  PAYEE_REQUIRED_MESSAGE,
  accountPayableCrossIssues,
  accountPayableFormObject,
  accountPayableLiveIssues,
  accountPayableFormSchema,
  createAccountPayableSchema,
  updateAccountPayableSchema,
};
