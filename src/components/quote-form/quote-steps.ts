import type { QuoteFieldName } from "./quote-form.types";

/**
 * The quote form's steps (design: Trajetto Orçamento). What blocks moving on
 * is quoteSchema itself, run on the client by the live validation (decision
 * 16.700): the "light checks" that used to mirror it let "Ana  Souza" or a
 * company with a symbol through to the server and its round trip.
 */

type QuoteStep = 1 | 2 | 3;

interface QuoteValues {
  fleet_size: string;
  name: string;
  company: string;
  email: string;
  telephone: string;
  message: string;
}

const EMPTY_QUOTE: QuoteValues = {
  fleet_size: "",
  name: "",
  company: "",
  email: "",
  telephone: "",
  message: "",
};

const STEP_TITLES = ["Operação", "Contato", "Detalhes"] as const;

/** The step each field lives on, to jump to the first one the server refused. */
const FIELD_STEP: Record<QuoteFieldName, QuoteStep> = {
  fleet_size: 1,
  name: 2,
  company: 2,
  email: 2,
  telephone: 2,
  message: 3,
};

/** Fields in the order the form shows them (first error gets focus). */
const FIELD_ORDER: QuoteFieldName[] = [
  "fleet_size",
  "name",
  "company",
  "email",
  "telephone",
  "message",
];

/** What "Continuar" (or the last step's submit) checks on each step. */
const STEP_FIELDS: Record<QuoteStep, QuoteFieldName[]> = {
  1: FIELD_ORDER.filter((field) => FIELD_STEP[field] === 1),
  2: FIELD_ORDER.filter((field) => FIELD_STEP[field] === 2),
  3: FIELD_ORDER.filter((field) => FIELD_STEP[field] === 3),
};

const FLEET_SIZES = [
  { value: "1-5", short: "1 a 5", label: "1 a 5 veículos" },
  { value: "6-15", short: "6 a 15", label: "6 a 15 veículos" },
  { value: "16-30", short: "16 a 30", label: "16 a 30 veículos" },
  { value: "31-50", short: "31 a 50", label: "31 a 50 veículos" },
  { value: "51-100", short: "51 a 100", label: "51 a 100 veículos" },
  { value: "101+", short: "100+", label: "Mais de 100 veículos" },
] as const;

/** "(11) 91234-5678" or "(11) 1234-5678" as the digits come in. */
function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = digits.length === 11 ? 5 : 4;
  if (rest.length <= split) return `(${area}) ${rest}`;

  return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export {
  EMPTY_QUOTE,
  FIELD_ORDER,
  FIELD_STEP,
  FLEET_SIZES,
  STEP_FIELDS,
  STEP_TITLES,
  formatPhone,
};
export type { QuoteStep, QuoteValues };
