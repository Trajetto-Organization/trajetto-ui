import {
  DEFAULT_TEXT_MAX_LENGTH,
  MAX_FORM_FIELDS,
  formatOccurrenceAnswer,
  normalizeFormFields,
  occurrenceFormFieldsSchema,
  readFormFields,
  type OccurrenceFormAnswer,
  type OccurrenceFormField,
  type OccurrenceFormFieldType,
} from "./rules";

/**
 * The form builder's state and its conversion to the stored definition.
 *
 * The screen edits strings (a number field's "mínimo" is typed, the options
 * are one per line); the API takes a typed definition. Kept pure so the
 * conversion — and every refusal a company can meet — is tested without a
 * browser.
 */

interface DraftField {
  /** React key only; never sent. */
  uid: string;
  key: string;
  /** False until someone edits the key by hand: the label keeps deriving it. */
  keyEdited: boolean;
  label: string;
  type: OccurrenceFormFieldType;
  required: boolean;
  help: string;
  /** select: one option per line. */
  optionsText: string;
  /** text */
  maxLength: string;
  multiline: boolean;
  /** number */
  min: string;
  max: string;
  integer: boolean;
}

const FIELD_TYPE_LABELS: Record<OccurrenceFormFieldType, string> = {
  text: "Texto",
  number: "Número",
  boolean: "Sim/não",
  select: "Lista de opções",
  date: "Data",
};

let uidSequence = 0;

function nextUid(): string {
  uidSequence += 1;

  return `campo-${uidSequence}`;
}

/**
 * A key from a label: "Quem atendeu?" → "quem_atendeu". Accents dropped,
 * anything else becomes "_", starts with a letter, at most 40 characters, and
 * unique among `taken` (a suffix when it collides).
 */
function keyFromLabel(
  label: string,
  taken: ReadonlySet<string> = new Set(),
): string {
  const base =
    label
      // NFKD also folds "ª"/"º" into letters, which NFD leaves alone.
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^([0-9])/, "campo_$1")
      .slice(0, 40) || "campo";

  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base.slice(0, 40 - String(suffix).length - 1)}_${suffix}`;

    if (!taken.has(candidate)) return candidate;
  }
}

function emptyDraft(type: OccurrenceFormFieldType = "text"): DraftField {
  return {
    uid: nextUid(),
    key: "",
    keyEdited: false,
    label: "",
    type,
    required: false,
    help: "",
    optionsText: "",
    maxLength: String(DEFAULT_TEXT_MAX_LENGTH),
    multiline: false,
    min: "",
    max: "",
    integer: false,
  };
}

/** A stored definition (from the API row) as the builder edits it. */
function draftsFromDefinition(stored: unknown): DraftField[] {
  return (readFormFields(stored) ?? []).map((field) => ({
    ...emptyDraft(field.type),
    key: field.key,
    keyEdited: true,
    label: field.label,
    required: field.required,
    help: field.help ?? "",
    optionsText: (field.options ?? []).join("\n"),
    maxLength: String(field.max_length ?? DEFAULT_TEXT_MAX_LENGTH),
    multiline: field.multiline === true,
    min: field.min === undefined ? "" : String(field.min),
    max: field.max === undefined ? "" : String(field.max),
    integer: field.integer === true,
  }));
}

/** Typed digits as a number; blank as absent; anything else as NaN (refused). */
function numberOrAbsent(text: string): number | undefined {
  const trimmed = text.trim().replace(",", ".");

  if (trimmed === "") return undefined;

  return Number(trimmed);
}

/** The draft as the API receives it, before validation. */
function draftToInput(draft: DraftField): Record<string, unknown> {
  const input: Record<string, unknown> = {
    key: draft.key,
    label: draft.label,
    type: draft.type,
    required: draft.required,
  };

  if (draft.help.trim() !== "") input.help = draft.help;

  if (draft.type === "select") {
    input.options = draft.optionsText
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter((option) => option !== "");
  }

  if (draft.type === "text") {
    input.max_length =
      numberOrAbsent(draft.maxLength) ?? DEFAULT_TEXT_MAX_LENGTH;
    input.multiline = draft.multiline;
  }

  if (draft.type === "number") {
    const min = numberOrAbsent(draft.min);
    const max = numberOrAbsent(draft.max);

    if (min !== undefined) input.min = min;
    if (max !== undefined) input.max = max;
    input.integer = draft.integer;
  }

  return input;
}

/**
 * The builder's inputs a refusal can point at (decision 3.4: the input turns
 * red with its message under it). A zod issue path is [index, property, …].
 */
const DRAFT_INPUTS = [
  "label",
  "type",
  "key",
  "help",
  "options",
  "max_length",
  "min",
  "max",
] as const;

type DraftInput = (typeof DRAFT_INPUTS)[number];

interface DraftFieldErrors {
  /** First problem per input of the question. */
  inputs: Partial<Record<DraftInput, string>>;
  /** A problem no single input owns. */
  card: string | null;
}

interface DefinitionVerdict {
  /** The normalized definition to send; null means "no form". */
  fields: OccurrenceFormField[] | null;
  /** Problems by draft index, per input, plus the form's own. */
  fieldErrors: Record<number, DraftFieldErrors>;
  formError: string | null;
  valid: boolean;
}

function isDraftInput(value: unknown): value is DraftInput {
  return (
    typeof value === "string" &&
    (DRAFT_INPUTS as readonly string[]).includes(value)
  );
}

/** The builder's drafts checked with the API's own schema. */
function definitionFromDrafts(drafts: DraftField[]): DefinitionVerdict {
  if (drafts.length === 0) {
    return { fields: null, fieldErrors: {}, formError: null, valid: true };
  }

  const parsed = occurrenceFormFieldsSchema.safeParse(drafts.map(draftToInput));

  if (parsed.success) {
    return {
      fields: normalizeFormFields(parsed.data),
      fieldErrors: {},
      formError: null,
      valid: true,
    };
  }

  const fieldErrors: Record<number, DraftFieldErrors> = {};
  let formError: string | null = null;

  // Typed text that is not a number reaches the schema as NaN, whose own
  // message is zod's English; the builder says it in the company's words.
  drafts.forEach((draft, index) => {
    const notANumber = (text: string) => Number.isNaN(numberOrAbsent(text));
    const inputs: DraftFieldErrors["inputs"] = {};

    if (draft.type === "number" && notANumber(draft.min)) {
      inputs.min = "O mínimo deve ser um número.";
    }

    if (draft.type === "number" && notANumber(draft.max)) {
      inputs.max = "O máximo deve ser um número.";
    }

    if (draft.type === "text" && notANumber(draft.maxLength)) {
      inputs.max_length = "O limite de caracteres deve ser um número.";
    }

    if (Object.keys(inputs).length > 0)
      fieldErrors[index] = { inputs, card: null };
  });

  for (const issue of parsed.error.issues) {
    const [index, property] = issue.path;

    if (typeof index !== "number") {
      formError ??= issue.message;
      continue;
    }

    const entry = (fieldErrors[index] ??= { inputs: {}, card: null });

    // An option's own problem ([index, "options", n]) is the options box's.
    if (isDraftInput(property)) {
      entry.inputs[property] ??= issue.message;
    } else {
      entry.card ??= issue.message;
    }
  }

  return { fields: null, fieldErrors, formError, valid: false };
}

/** What the answers read as, labelled with the type's form, in its order. */
function labelledAnswers(
  storedFields: unknown,
  answers: unknown,
): Array<{ key: string; label: string; value: string }> {
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    return [];

  const given = answers as Record<string, OccurrenceFormAnswer>;
  const fields = readFormFields(storedFields) ?? [];

  const known = fields
    .filter((field) => Object.prototype.hasOwnProperty.call(given, field.key))
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: formatOccurrenceAnswer(field, given[field.key]),
    }));

  // A question the company removed since: its key stands in for the label.
  const orphans = Object.keys(given)
    .filter((key) => !fields.some((field) => field.key === key))
    .map((key) => ({
      key,
      label: key,
      value: formatOccurrenceAnswer(undefined, given[key]),
    }));

  return [...known, ...orphans];
}

/**
 * What the panel's inputs hold (strings; "true"/"false" for sim/não) as the
 * typed answers the API validates. Blank stays absent, so a required field
 * left empty is reported by validateOccurrenceAnswers, not guessed here; a
 * number that does not parse is kept as text, so the check refuses it.
 */
function answersFromInputs(
  fields: OccurrenceFormField[] | null,
  inputs: Record<string, string>,
): Record<string, OccurrenceFormAnswer> {
  const answers: Record<string, OccurrenceFormAnswer> = {};

  for (const field of fields ?? []) {
    const raw = inputs[field.key];

    if (raw === undefined || raw.trim() === "") continue;

    if (field.type === "boolean") {
      answers[field.key] = raw === "true";
    } else if (field.type === "number") {
      const parsed = Number(raw.trim().replace(",", "."));

      answers[field.key] = Number.isFinite(parsed) ? parsed : raw;
    } else {
      answers[field.key] = raw;
    }
  }

  return answers;
}

export {
  FIELD_TYPE_LABELS,
  MAX_FORM_FIELDS,
  answersFromInputs,
  definitionFromDrafts,
  draftToInput,
  draftsFromDefinition,
  emptyDraft,
  keyFromLabel,
  labelledAnswers,
};
export type { DefinitionVerdict, DraftField, DraftFieldErrors, DraftInput };
