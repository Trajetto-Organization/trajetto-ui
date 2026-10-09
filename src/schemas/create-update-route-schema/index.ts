import { z } from "zod";

import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
  localDateKey,
} from "@/lib/format-values";

/**
 * Mirrors the API's route schemas (trajetto-api/src/schemas/route-schema and
 * src/shared/route/route-plan-rules), message for message, so a refusal reads
 * the same whether the browser or the server produced it.
 *
 * The day is a civil date, "YYYY-MM-DD" (decision 1.3). The planned departure
 * and return are instants WITH an offset (decision 1.4): the DateTimePickerField
 * posts `toISOString()` of the local moment, and a wall time without one is
 * refused on both sides. `""` becomes `null` throughout, because that is what
 * an empty input posts and the API distinguishes "leave it" (absent) from
 * "clear it" (null).
 *
 * The day rules (departure on the route's day, return not before it) are
 * read in `plan_time_zone`: the COMPANY's zone (Business.timezone), which the
 * assignment preview answers, and the browser's only until it has. The API
 * reads them in the company's zone too, so a MASTER working from another
 * zone gets the same verdict on both sides.
 */
const ROUTE_NAME_MAX = 80;
const ROUTE_DESTINATION_MAX = 160;

const ROUTE_PLAN_MESSAGES = {
  arrivalBeforeDeparture:
    "O retorno previsto deve ser igual ou posterior à saída prevista.",
  departureOffDay: "A saída prevista deve ser no dia da rota.",
  arrivalBeforeDay: "O retorno previsto não pode ser antes do dia da rota.",
} as const;

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day ("2026-02-30" is not). */
const isValidDateKey = (value: string): boolean => {
  const match = DATE_KEY.exec(value);

  if (!match) return false;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  return date.toISOString().slice(0, 10) === value;
};

/** The three text rules of the product, with the field's own label. */
const optionalText = (label: string, max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .max(max, `${label} deve ter no máximo ${max} caracteres.`)
      .superRefine((value, ctx) => {
        if (isEmptyOrWhitespace(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} não pode conter apenas espaços.`,
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
      })
      .nullable()
      .optional(),
  );

/** The route's day. One refusal per value, like the API. */
const routeDay = (required: string) =>
  z.string({ required_error: required }).superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: required });
      return;
    }

    if (!DATE_KEY.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data da rota deve estar no formato AAAA-MM-DD.",
      });
      return;
    }

    if (!isValidDateKey(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data da rota é inválida.",
      });
    }
  });

/** A planned instant: ISO with offset, or empty for none. */
const plannedInstant = (label: string) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .datetime({
        offset: true,
        message: `${label} deve ter data, hora e fuso (ex.: 2026-09-17T08:00:00-03:00).`,
      })
      .nullable()
      .optional(),
  );

interface RoutePlanValues {
  scheduled_date?: string;
  planned_departure_at?: string | null;
  planned_arrival_at?: string | null;

  /**
   * The zone the day rules are read in (IANA): the company's, from the
   * assignment preview, or the browser's until it answered. A server action
   * runs on the Next server — UTC in the container — so the zone travels
   * with the form; without it the day is read on this runtime's own
   * calendar.
   */
  plan_time_zone?: string | null;
}

/** The civil day of an instant in a zone (the runtime's own when absent). */
function dayKeyIn(instant: Date, timeZone?: string | null): string {
  if (!timeZone) return localDateKey(instant);

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);

    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((entry) => entry.type === type)?.value ?? "";

    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    // An unknown zone name: the runtime's calendar rather than a refusal.
    return localDateKey(instant);
  }
}

/**
 * The window's rules, as trajetto-api/src/shared/route/route-plan-rules: the
 * departure on the route's day, the return not before the departure — nor,
 * when there is none, before the route's day. One refusal per field.
 */
function routePlanIssues({
  scheduled_date,
  planned_departure_at,
  planned_arrival_at,
  plan_time_zone,
}: RoutePlanValues): Array<{
  field: "planned_departure_at" | "planned_arrival_at";
  message: string;
}> {
  const issues: Array<{
    field: "planned_departure_at" | "planned_arrival_at";
    message: string;
  }> = [];

  const departure = planned_departure_at
    ? new Date(planned_departure_at)
    : null;
  const arrival = planned_arrival_at ? new Date(planned_arrival_at) : null;

  if (
    departure &&
    scheduled_date &&
    isValidDateKey(scheduled_date) &&
    dayKeyIn(departure, plan_time_zone) !== scheduled_date
  ) {
    issues.push({
      field: "planned_departure_at",
      message: ROUTE_PLAN_MESSAGES.departureOffDay,
    });
  }

  if (departure && arrival && arrival.getTime() < departure.getTime()) {
    issues.push({
      field: "planned_arrival_at",
      message: ROUTE_PLAN_MESSAGES.arrivalBeforeDeparture,
    });
  } else if (
    arrival &&
    scheduled_date &&
    isValidDateKey(scheduled_date) &&
    // "YYYY-MM-DD" keys compare as the days they name.
    dayKeyIn(arrival, plan_time_zone) < scheduled_date
  ) {
    issues.push({
      field: "planned_arrival_at",
      message: ROUTE_PLAN_MESSAGES.arrivalBeforeDay,
    });
  }

  return issues;
}

const refineRoutePlan = (
  value: RoutePlanValues,
  ctx: z.RefinementCtx,
): void => {
  for (const issue of routePlanIssues(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [issue.field],
      message: issue.message,
    });
  }
};

/** The plan's fields, shared by the route form and the assignment dialog. */
const routePlanFields = {
  destination: optionalText("O destino", ROUTE_DESTINATION_MAX),
  // Read by the day rules only; the actions leave it out of the API's body.
  plan_time_zone: z.string().max(64).optional(),
  planned_departure_at: plannedInstant("A saída prevista"),
  planned_arrival_at: plannedInstant("O retorno previsto"),
};

const routeFormObject = z.object({
  driverId: z
    .string({ required_error: "O motorista é obrigatório." })
    .uuid("O motorista deve ter um identificador válido."),

  /**
   * Optional while planning and required to release — the API refuses the
   * handover without one, because discovering at the truck that no vehicle
   * was assigned costs a phone call and a morning.
   */
  vehicleId: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .uuid("O veículo deve ter um identificador válido.")
      .nullable()
      .optional(),
  ),

  name: optionalText("O nome da rota", ROUTE_NAME_MAX),

  scheduled_date: routeDay("A data da rota é obrigatória."),

  ...routePlanFields,
});

const createUpdateRouteSchema = routeFormObject.superRefine(refineRoutePlan);

/** The fields "Editar rota" may change, as the API's update names them. */
const ROUTE_EDIT_FIELDS = [
  "name",
  "destination",
  "driverId",
  "vehicleId",
  "scheduled_date",
  "planned_departure_at",
  "planned_arrival_at",
] as const;

type RouteEditField = (typeof ROUTE_EDIT_FIELDS)[number];

const ROUTE_PLAN_EDIT_FIELDS: readonly RouteEditField[] = [
  "scheduled_date",
  "planned_departure_at",
  "planned_arrival_at",
];

const INSTANT_FIELDS: readonly RouteEditField[] = [
  "planned_departure_at",
  "planned_arrival_at",
];

/** Two instants as the same moment ("" is none), whatever their spelling. */
function sameInstant(a: string, b: string): boolean {
  if (!a || !b) return !a && !b;

  const [left, right] = [new Date(a).getTime(), new Date(b).getTime()];

  return Number.isNaN(left) || Number.isNaN(right) ? a === b : left === right;
}

/**
 * The fields the form holds that differ from what the route held when the
 * dialog opened. The edit sends only these, as a partial update: the API
 * judges the plan only when the edit touches it, so renaming a route whose
 * stored window predates the rule is not refused for times nobody changed.
 */
function changedRouteFields(
  values: Partial<Record<RouteEditField, string>>,
  initial: Record<RouteEditField, string>,
): RouteEditField[] {
  return ROUTE_EDIT_FIELDS.filter((field) => {
    const now = values[field] ?? "";
    const before = initial[field] ?? "";

    return INSTANT_FIELDS.includes(field)
      ? !sameInstant(now, before)
      : now !== before;
  });
}

type RouteEditRequest =
  | { success: true; body: Record<string, unknown> }
  | { success: false; fieldErrors: Record<string, string[]> };

/**
 * What "Editar rota" sends, from the form's values and `changed_fields`
 * (the comma list changedRouteFields produced in the browser): only the
 * changed fields, each checked by its own rules, and the window's rules only
 * when a plan field changed — judged on the plan as it WILL be (the changed
 * values with the untouched ones the form still holds), like the API's
 * update against its stored values.
 *
 * Without `changed_fields` (a form from before this rule) every field is
 * sent and checked, as it always was.
 */
function routeEditRequest(values: Record<string, string>): RouteEditRequest {
  const { changed_fields: changedParam, ...form } = values;

  if (changedParam === undefined) {
    const full = createUpdateRouteSchema.safeParse(form);

    if (!full.success) {
      return {
        success: false,
        fieldErrors: full.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const { plan_time_zone: _zone, ...body } = full.data;

    return { success: true, body };
  }

  const changed = new Set(
    changedParam
      .split(",")
      .map((field) => field.trim())
      .filter((field): field is RouteEditField =>
        (ROUTE_EDIT_FIELDS as readonly string[]).includes(field),
      ),
  );

  const picked = Object.fromEntries(
    [...changed].map((field) => [field, form[field] ?? ""]),
  );

  const parsed = routeFormObject.partial().safeParse(picked);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  if (ROUTE_PLAN_EDIT_FIELDS.some((field) => changed.has(field))) {
    const issues = routePlanIssues({
      scheduled_date: form.scheduled_date,
      planned_departure_at: form.planned_departure_at || null,
      planned_arrival_at: form.planned_arrival_at || null,
      plan_time_zone: form.plan_time_zone,
    });

    if (issues.length > 0) {
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of issues) {
        (fieldErrors[issue.field] ??= []).push(issue.message);
      }

      return { success: false, fieldErrors };
    }
  }

  // Keys zod left undefined are not sent: absent means "leave it".
  const body = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([key, value]) => key !== "plan_time_zone" && value !== undefined,
    ),
  );

  return { success: true, body };
}

/**
 * What the route form shows under each field while it is filled (decision
 * 16.700), by the rules the actions apply on submit:
 *
 * - creating: every field, then the window's rules — as the create action's
 *   createUpdateRouteSchema, but without waiting for every other field to be
 *   valid (an object superRefine does);
 * - editing (`initial` given): only the fields that changed, and the window's
 *   rules only when a plan field changed — as routeEditRequest, so a route
 *   whose stored values predate a rule can still be saved.
 *
 * An empty driver reads as missing ("O motorista é obrigatório."), not as an
 * invalid id: that is what the person did.
 */
function routeFormLiveIssues(
  values: Record<RouteEditField, string> & { plan_time_zone?: string | null },
  initial?: Record<RouteEditField, string> | null,
): Partial<Record<RouteEditField, string | null>> {
  const checked = initial
    ? changedRouteFields(values, initial)
    : [...ROUTE_EDIT_FIELDS];
  const shape = routeFormObject.shape as Record<RouteEditField, z.ZodTypeAny>;
  const issues: Partial<Record<RouteEditField, string | null>> = {};

  for (const field of checked) {
    const value =
      field === "driverId" && values.driverId === ""
        ? undefined
        : values[field];
    const result = shape[field].safeParse(value);

    issues[field] = result.success
      ? null
      : (result.error.issues[0]?.message ?? null);
  }

  if (
    !initial ||
    ROUTE_PLAN_EDIT_FIELDS.some((field) => checked.includes(field))
  ) {
    for (const issue of routePlanIssues({
      scheduled_date: values.scheduled_date,
      planned_departure_at: values.planned_departure_at || null,
      planned_arrival_at: values.planned_arrival_at || null,
      plan_time_zone: values.plan_time_zone,
    })) {
      issues[issue.field] ??= issue.message;
    }
  }

  return issues;
}

/**
 * The plan the batch assignment gives the route it creates (decision 6.5):
 * the API's assign schema, which takes the same fields under the same rules.
 */
const assignRoutePlanSchema = z
  .object({
    scheduled_date: routeDay("A data da rota é obrigatória."),
    ...routePlanFields,
  })
  .superRefine(refineRoutePlan);

/**
 * The cancellation reason is required, and not as ceremony: cancelling a route
 * that already left throws away a driver's morning, and the only way anyone
 * reconstructs why is if the person who did it said so at the time.
 */
const cancelRouteSchema = z.object({
  reason: z
    .string({ required_error: "Informe o motivo do cancelamento da rota." })
    .trim()
    // Empty or blank (trimmed above) is a missing reason, not a short one (16.702).
    .min(1, "Informe o motivo do cancelamento da rota.")
    .min(3, "O motivo deve ter no mínimo 3 caracteres.")
    .max(255, "O motivo deve ter no máximo 255 caracteres."),
});

export {
  ROUTE_DESTINATION_MAX,
  ROUTE_EDIT_FIELDS,
  ROUTE_NAME_MAX,
  ROUTE_PLAN_MESSAGES,
  assignRoutePlanSchema,
  cancelRouteSchema,
  changedRouteFields,
  createUpdateRouteSchema,
  routeEditRequest,
  routeFormLiveIssues,
  routePlanIssues,
};
export type { RouteEditField, RouteEditRequest };
