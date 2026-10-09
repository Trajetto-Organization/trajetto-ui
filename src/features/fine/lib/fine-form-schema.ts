import { z } from "zod";

/**
 * The fine form's rules, mirrored from trajetto-api
 * (schemas/create-fine-schema/fine-fields.ts and
 * modules/fine/usecases/fine-dates.ts) with the same messages, so the web
 * refuses what the API refuses and says it the same way.
 *
 * Location and observation used to accept only letters, digits, spaces and
 * hyphens: "Av. Brasil, 1000" — the address as the notice prints it — was
 * refused. They follow the product's text rules now; the observation is
 * multiline (decision 5.5).
 *
 * The dates are days ("YYYY-MM-DD"), as the picker gives them; the API
 * stores each as the instant the day starts in the company's zone. This
 * schema runs in the server action, whose clock is UTC — ahead of every
 * Brazilian zone — so its "not in the future" checks can only let through
 * what the API then refuses on the company's business day, never refuse a
 * day the API would take.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A day that exists (2026-02-30 does not), or an instant from an older page. */
function isValidDate(value: string): boolean {
  const day = DATE_ONLY.exec(value);

  if (!day) return !Number.isNaN(new Date(value).getTime());

  const date = new Date(
    Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3])),
  );

  return date.toISOString().slice(0, 10) === value;
}

/** "YYYY-MM-DD": a day as it is, an instant read on this process's clock. */
function localDayKey(value: string | Date): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;

  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

/** "R$ 1.234,56", "1234,56" or "1234.56" → 1234.56. */
function parseAmount(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const cleaned = value.replace(/[^\d,.]/g, "");

  if (cleaned === "" || cleaned === "," || cleaned === ".") return undefined;

  // A comma means the Brazilian format: dots are thousands.
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  return parseFloat(normalized);
}

function coordinate(min: number, max: number, label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        if (value.trim() === "" || value === "null") return null;

        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? value : parsed;
      }

      return value;
    },
    z
      .number({ invalid_type_error: `A ${label} deve ser um número válido.` })
      .min(min, `A ${label} deve estar entre ${min} e ${max}.`)
      .max(max, `A ${label} deve estar entre ${min} e ${max}.`)
      .nullable()
      .optional(),
  );
}

const INLINE_SPACE_RUN = /[^\S\r\n]{2,}/;
const INLINE_SPACE_AT_LINE_EDGE = /^[^\S\r\n]|[^\S\r\n]$/;

const fineFieldsSchema = z.object({
  violation_date: z
    .string({ required_error: "A data da infração é obrigatória." })
    .min(1, "A data da infração é obrigatória.")
    .refine(isValidDate, "A data da infração é inválida."),
  due_date: z
    .string({ required_error: "A data de vencimento é obrigatória." })
    .min(1, "A data de vencimento é obrigatória.")
    .refine(isValidDate, "A data de vencimento é inválida."),
  payment_date: z.preprocess(
    emptyToNull,
    z
      .string()
      .refine(isValidDate, "A data de pagamento é inválida.")
      .nullable()
      .optional(),
  ),
  amount: z.preprocess(
    parseAmount,
    z
      .number({
        required_error: "O valor da multa é obrigatório.",
        invalid_type_error: "O valor da multa deve ser um número válido.",
      })
      .positive("O valor da multa deve ser maior que zero.")
      .max(999999.99, "O valor da multa não pode exceder R$ 999.999,99."),
  ),
  points: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      if (value.trim() === "") return undefined;

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z
      .number({
        required_error: "A pontuação é obrigatória.",
        invalid_type_error: "A pontuação deve ser um número válido.",
      })
      .int("A pontuação deve ser um número inteiro.")
      .min(0, "A pontuação não pode ser negativa.")
      .max(20, "A pontuação não pode exceder 20 pontos."),
  ),
  location: z.preprocess(
    emptyToNull,
    z
      .string()
      .max(200, "O local da infração deve ter no máximo 200 caracteres.")
      .superRefine((value, ctx) => {
        if (/\s{2,}/.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O local da infração não deve conter espaços consecutivos.",
          });
        } else if (/^\s|\s$/.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O local da infração não pode começar ou terminar com espaço em branco.",
          });
        }
      })
      .nullable()
      .optional(),
  ),
  observation: z.preprocess(
    emptyToNull,
    z
      .string()
      .max(500, "O campo Observações deve ter no máximo 500 caracteres.")
      .superRefine((value, ctx) => {
        if (INLINE_SPACE_RUN.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O campo Observações não deve conter espaços consecutivos.",
          });
        } else if (
          value !== value.trim() ||
          value
            .split(/\r?\n/)
            .some((line) => INLINE_SPACE_AT_LINE_EDGE.test(line))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O campo Observações não pode começar ou terminar com espaço em branco.",
          });
        }
      })
      .nullable()
      .optional(),
  ),
  branchId: z.string().regex(UUID, "Selecione a filial."),
  driverId: z.string().regex(UUID, "Selecione o motorista."),
  vehicleId: z.string().regex(UUID, "Selecione o veículo."),
  trafficViolationCodeId: z
    .string()
    .regex(UUID, "Selecione o código de infração."),
  latitude: coordinate(-90, 90, "latitude"),
  longitude: coordinate(-180, 180, "longitude"),
});

interface FineDateIssues {
  violation_date?: string;
  due_date?: string;
  payment_date?: string;
}

/**
 * The rules between the dates, per field. The schema's refine runs them on
 * the action's clock; the form runs them live (fineFormRules), without
 * waiting for the amount or the points to be valid first. A date that is
 * missing or invalid is left to its own field's message.
 */
function fineDateIssues(
  data: {
    violation_date?: string;
    due_date?: string;
    payment_date?: string | null;
  },
  today: string,
): FineDateIssues {
  const issues: FineDateIssues = {};
  const usable = (value: string | null | undefined): value is string =>
    typeof value === "string" && value !== "" && isValidDate(value);

  if (!usable(data.violation_date)) return issues;

  const violation = localDayKey(data.violation_date);

  if (violation > today) {
    issues.violation_date = "A data da infração não pode ser futura.";
  }

  if (usable(data.due_date) && localDayKey(data.due_date) <= violation) {
    issues.due_date =
      "A data de vencimento deve ser posterior à data da infração.";
  }

  if (usable(data.payment_date)) {
    const payment = localDayKey(data.payment_date);

    if (payment < violation) {
      issues.payment_date =
        "A data de pagamento não pode ser anterior à data da infração.";
    } else if (payment > today) {
      issues.payment_date = "A data de pagamento não pode ser futura.";
    }
  }

  return issues;
}

const fineFormSchema = fineFieldsSchema.superRefine((data, ctx) => {
  const issues = fineDateIssues(data, localDayKey(new Date()));

  for (const [field, message] of Object.entries(issues)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
  }
});

/**
 * Today for the browser's live check: the UTC day, ahead of every Brazilian
 * zone, so "não pode ser futura" never refuses a day the API (on the
 * company's business day) would take — the same bias the action's UTC clock
 * has.
 */
function liveTodayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type FineFormValues = z.infer<typeof fineFormSchema>;

export {
  fineDateIssues,
  fineFieldsSchema,
  fineFormSchema,
  liveTodayKey,
  localDayKey,
  parseAmount,
  type FineFormValues,
};
