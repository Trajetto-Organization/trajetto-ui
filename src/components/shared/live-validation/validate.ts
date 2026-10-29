import { z, type ZodTypeAny } from "zod";

/**
 * The pure half of live validation: which message a field shows for a given
 * set of values, computed from the SAME zod schema the server action runs.
 * No React here, so the rules are tested without rendering anything.
 */

// `object`, not Record<string, unknown>: a form's values and its action's
// error type are interfaces, which have no index signature.
type FieldValues = object;

const read = (source: object | null | undefined, field: string): unknown =>
  source ? (source as Record<string, unknown>)[field] : undefined;

/** A cross-field or data-dependent rule's answer: a message, or nothing. */
type RuleResult = Partial<Record<string, string | null | undefined | false>>;

type Rules<V extends FieldValues> = (values: V) => RuleResult;

/** Server-action errors as a zod flatten produces them, or plain strings. */
type ServerFieldErrors = object;

/**
 * The object behind `.refine()` / `.superRefine()` / `.transform()` wrappers,
 * whose `.shape` validates one field at a time. Null for a non-object schema.
 */
function objectSchemaOf(schema: ZodTypeAny | undefined): z.AnyZodObject | null {
  let current: ZodTypeAny | undefined = schema;

  // Bounded: a schema is never wrapped more than a few times, and a cycle
  // here would hang the form instead of failing loudly.
  for (let depth = 0; current && depth < 10; depth += 1) {
    if (current instanceof z.ZodObject) return current;
    if (current instanceof z.ZodEffects) {
      current = current.innerType();
      continue;
    }

    return null;
  }

  return null;
}

/** Whether rules live on the object itself (a refine reading several fields). */
function hasObjectRefinement(schema: ZodTypeAny | undefined): boolean {
  return schema instanceof z.ZodEffects;
}

function firstMessage(error: unknown): string | null {
  if (typeof error === "string") return error.trim() || null;
  if (!Array.isArray(error)) return null;

  const first = error.find(
    (message) => typeof message === "string" && message.trim(),
  );
  return typeof first === "string" ? first.trim() : null;
}

/** The first issue of each top-level field, from one full parse. */
function issuesByField(
  schema: ZodTypeAny,
  values: FieldValues,
): Map<string, string> {
  const result = schema.safeParse(values);
  const byField = new Map<string, string>();

  if (result.success) return byField;

  for (const issue of result.error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !byField.has(field)) {
      byField.set(field, issue.message);
    }
  }

  return byField;
}

interface FieldValidator {
  /** The field's message for these values, or null when it is valid. */
  messageOf: (field: string) => string | null;

  /** Every field the form validates on submit, in a stable order. */
  fields: readonly string[];
}

/**
 * Validates fields lazily, each at most once per set of values.
 *
 * Order of precedence for one field:
 * 1. the field's own schema (`shape[field]`), which carries its trims,
 *    preprocessing and superRefine — the exact message the server returns;
 * 2. an object-level refine aimed at that field (only computed when the
 *    schema has one, and only once for all fields);
 * 3. the caller's `rules`: what the client knows and the schema cannot
 *    (the vehicle's last mileage, a photo that must be attached).
 */
function createFieldValidator<V extends FieldValues>({
  schema,
  values,
  rules,
  fields,
}: {
  schema?: ZodTypeAny;
  values: V;
  rules?: Rules<V>;
  fields?: readonly string[];
}): FieldValidator {
  const object = objectSchemaOf(schema);
  const shape = (object?.shape ?? {}) as Record<string, ZodTypeAny>;
  const refined = hasObjectRefinement(schema);

  const cache = new Map<string, string | null>();
  let refineIssues: Map<string, string> | null = null;
  let ruleResult: RuleResult | null = null;

  const rulesFor = (): RuleResult => {
    ruleResult ??= rules ? rules(values) : {};
    return ruleResult;
  };

  const allFields =
    fields ??
    Array.from(new Set([...Object.keys(shape), ...Object.keys(rulesFor())]));

  const messageOf = (field: string): string | null => {
    if (cache.has(field)) return cache.get(field)!;

    let message: string | null = null;
    const own = shape[field];

    if (own) {
      const result = own.safeParse(read(values, field));
      if (!result.success) message = result.error.issues[0]?.message ?? null;
    }

    if (!message && refined && schema) {
      refineIssues ??= issuesByField(schema, values);
      message = refineIssues.get(field) ?? null;
    }

    if (!message) {
      const rule = rulesFor()[field];
      message = typeof rule === "string" && rule.trim() ? rule : null;
    }

    cache.set(field, message);
    return message;
  };

  return { messageOf, fields: allFields };
}

/** Two field values are the same input: "" and null/undefined count as empty. */
function sameFieldValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  const normalise = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object") return JSON.stringify(value);

    return String(value);
  };

  return normalise(a) === normalise(b);
}

/** Whether any of `fields` (all of `initial` by default) differs from what the form opened on. */
function isDirtyAgainst(
  initial: FieldValues,
  values: FieldValues,
  fields: readonly string[] = Object.keys(initial),
): boolean {
  return fields.some(
    (field) => !sameFieldValue(read(initial, field), read(values, field)),
  );
}

/**
 * The submit rule (decision 16.701): a create form's button is always
 * enabled, so pressing it explains what is missing; an edit form's stays
 * disabled while nothing changed, which is the only thing it would refuse.
 */
function canSubmitForm({
  isEdit,
  isDirty,
}: {
  isEdit: boolean;
  isDirty: boolean;
}): boolean {
  return !isEdit || isDirty;
}

export {
  read as readField,
  canSubmitForm,
  createFieldValidator,
  firstMessage,
  hasObjectRefinement,
  isDirtyAgainst,
  objectSchemaOf,
  sameFieldValue,
};
export type {
  FieldValidator,
  FieldValues,
  RuleResult,
  Rules,
  ServerFieldErrors,
};
