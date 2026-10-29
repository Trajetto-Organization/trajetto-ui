import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * The driver screens' pure rules, shared by the server content, the client
 * components and their tests. No directive and no hooks: both graphs import it.
 */

/** Where the screen reads its company from (decision 8.7). */
type DriverScope = "admin" | "dashboard";

/**
 * `admin` is the MASTER's /admin: the company picked in the selector at the
 * top (`?businessId=`), and nothing to show until one is picked.
 * `dashboard` is everyone else's: the session's company, never the URL's —
 * the API pins them to it anyway.
 */
function scopedDriverBusinessId(
  scope: DriverScope,
  urlBusinessId: string | null | undefined,
  sessionBusinessId: string | null | undefined,
): string | undefined {
  if (scope === "admin") return readBusinessIdParam(urlBusinessId);

  return sessionBusinessId || undefined;
}

/** CTB art. 143 classes, in the order the API's enum declares them. */
const CNH_CATEGORIES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "AB",
  "AC",
  "AD",
  "AE",
] as const;

type CnhCategory = (typeof CNH_CATEGORIES)[number];

/** The form's "none" choice: a Select item cannot carry an empty value. */
const CNH_CATEGORY_NONE = "NONE";

const CNH_CATEGORY_OPTIONS = [
  ...CNH_CATEGORIES.map((category) => ({ value: category, label: category })),
  { value: CNH_CATEGORY_NONE, label: "Não informada" },
];

const DRIVER_STATUS_LABELS = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
} as const;

const DRIVER_CONTRACT_LABELS = {
  OWNED: "Próprio",
  THIRD_PARTY: "Terceirizado",
} as const;

type CnhStatus = "EXPIRED" | "EXPIRING" | "VALID";

/** How the table reads the API's `cnh_status` (the company's business day). */
const CNH_STATUS_META: Record<CnhStatus, { label: string; className: string }> =
  {
    EXPIRED: {
      label: "Vencida",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    },
    EXPIRING: {
      label: "Vence em até 30 dias",
      className:
        "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    },
    VALID: {
      label: "Em dia",
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
    },
  };

const CNH_MAX_VALIDITY_YEARS = 10;
const CNH_EARLIEST_EXPIRY = "1970-01-01";

/**
 * Why a CNH expiry cannot be saved, or null. Mirrors the API
 * (trajetto-api/src/modules/driver/driver-rules.ts `cnhExpiryIssue`), with
 * the same messages: an expired date is accepted, a typo ten years ahead is not.
 */
function cnhExpiryIssue(value: string, todayKey: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "A validade da CNH deve ser uma data no formato AAAA-MM-DD.";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "A validade da CNH não é uma data válida.";
  }

  if (value < CNH_EARLIEST_EXPIRY) {
    return "A validade da CNH é anterior a 1970. Confira a data.";
  }

  const latest = `${Number(todayKey.slice(0, 4)) + CNH_MAX_VALIDITY_YEARS}${todayKey.slice(4)}`;

  if (value > latest) {
    return `A validade da CNH não pode passar de ${CNH_MAX_VALIDITY_YEARS} anos a partir de hoje.`;
  }

  return null;
}

/** CTB art. 140 I: a CNH is only issued from 18. */
const DRIVER_MIN_AGE = 18;
const EARLIEST_BIRTH_DATE = "1900-01-01";

/**
 * The civil day a birth date names, or null. Mirrors the API
 * (trajetto-api/src/modules/driver/driver-rules.ts `birthDateKeyOf`): a
 * "YYYY-MM-DD" is the day itself; an instant (the old form's local midnight)
 * is read on its UTC day, which in Brazil is still that day.
 */
function birthDateKeyOf(value: string): string | null {
  const text = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    const real =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    return real ? text : null;
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(text)) return null;

  const key = dateOnlyKeyOf(text);

  return key || null;
}

/**
 * Whether someone born on `birthKey` has turned `age` on `todayKey`. Born on
 * 29/02, the birthday in a common year is 01/03 (Código Civil art. 132 §3),
 * which comparing the text gives.
 */
function hasTurned(birthKey: string, todayKey: string, age: number): boolean {
  const year = String(Number(birthKey.slice(0, 4)) + age).padStart(4, "0");

  return `${year}${birthKey.slice(4)}` <= todayKey;
}

/**
 * Why a birth date cannot be saved, or null. Mirrors the API's
 * `birthDateIssue`, messages included; `todayKey` is a civil day, never the
 * browser's calendar read with getDate().
 */
function birthDateIssue(value: string, todayKey: string): string | null {
  const key = birthDateKeyOf(value);

  if (!key) return "Data de nascimento inválida.";

  if (key < EARLIEST_BIRTH_DATE) {
    return "A data de nascimento é anterior a 1900. Confira a data.";
  }

  if (!hasTurned(key, todayKey, DRIVER_MIN_AGE)) {
    return `O motorista deve ter pelo menos ${DRIVER_MIN_AGE} anos.`;
  }

  return null;
}

/**
 * The "YYYY-MM-DD" a date-only column carries (stored as UTC midnight), for
 * the form's `dateOnly` field. Read in UTC: in the browser's zone the 17th
 * would come back as the 16th.
 */
function dateOnlyKeyOf(value: string | Date | null | undefined): string {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** The fields the form edits, as the form holds them (strings). */
interface DriverFormValues {
  name: string;
  birth_date: string;
  cpf: string;
  rg: string;
  cnh: string;
  cnh_category: string;
  cnh_expires_at: string;
  status: string;
  contract_type: string;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  complement: string;
  branchId: string;
}

interface DriverRecordForForm {
  name: string;
  birth_date: string | Date;
  cpf: string;
  rg: string;
  cnh: string;
  cnh_category?: string | null;
  cnh_expires_at?: string | Date | null;
  status: string;
  contract_type: string;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  complement?: string | null;
  branchId?: string | null;
}

/** A stored driver as the edit form starts from it. */
function driverFormValuesOf(driver: DriverRecordForForm): DriverFormValues {
  return {
    name: driver.name ?? "",
    // A civil day for the form's date-only field (stored as UTC midnight;
    // older rows hold local midnight, which is the same UTC day in Brazil).
    birth_date: dateOnlyKeyOf(driver.birth_date),
    cpf: driver.cpf ?? "",
    rg: driver.rg ?? "",
    cnh: driver.cnh ?? "",
    cnh_category: driver.cnh_category ?? "",
    cnh_expires_at: dateOnlyKeyOf(driver.cnh_expires_at),
    status: driver.status ?? "",
    contract_type: driver.contract_type ?? "",
    cep: driver.cep ?? "",
    city: driver.city ?? "",
    uf: driver.uf ?? "",
    street: driver.street ?? "",
    address_number: driver.address_number ?? "",
    complement: driver.complement ?? "",
    branchId: driver.branchId ?? "",
  };
}

const DIGIT_FIELDS = new Set(["cpf", "rg", "cnh", "cep"]);

/** Two spellings of the same value compare equal: masks, blanks, dates. */
function normalizedFormValue(
  field: keyof DriverFormValues,
  value: string,
): string {
  const text = (value ?? "").trim();

  if (DIGIT_FIELDS.has(field)) return text.replace(/\D/g, "");

  if (field === "birth_date") return dateOnlyKeyOf(text) || text;

  // "None" is how the form spells a blank category.
  if (field === "cnh_category") return text === CNH_CATEGORY_NONE ? "" : text;

  if (field === "uf") return text.toUpperCase();

  return text;
}

/**
 * Which fields the person changed (decision 2.5: Save stays disabled until
 * something did). A mask typed back to the stored digits, the category set
 * to "Não informada" when it was blank, or the birth date re-picked on the
 * same day are no change.
 */
function changedDriverFields(
  original: DriverFormValues,
  current: Partial<DriverFormValues>,
): Array<keyof DriverFormValues> {
  return (Object.keys(original) as Array<keyof DriverFormValues>).filter(
    (field) =>
      current[field] !== undefined &&
      normalizedFormValue(field, current[field] as string) !==
        normalizedFormValue(field, original[field]),
  );
}

interface DriverListSearchMeta {
  total?: number;
  active?: number;
  inactive?: number;
  owned?: number;
  thirdParty?: number;
  facets?: Record<
    string,
    Array<{ value: string; label?: string; count: number }>
  >;
}

/**
 * The cards' numbers, from the server's `searchMeta` only (decision 8.8):
 * counted over the whole company under the other filters, never over the
 * page. Undefined when the API did not send them, so a card says "—" instead
 * of a confident zero next to a non-zero total.
 */
function driverStatsData(searchMeta: DriverListSearchMeta | undefined) {
  return {
    totalDrivers: searchMeta?.total,
    activeDrivers: searchMeta?.active,
    inactiveDrivers: searchMeta?.inactive,
    ownedDrivers: searchMeta?.owned,
    contractTotal:
      searchMeta?.owned !== undefined && searchMeta?.thirdParty !== undefined
        ? searchMeta.owned + searchMeta.thirdParty
        : undefined,
  };
}

/** "7 (70%)" — or "—" when the number is unknown. */
function countWithShare(
  count: number | undefined,
  total: number | undefined,
): string {
  if (count === undefined || total === undefined) return "—";

  return total > 0 ? `${count} (${Math.round((count / total) * 100)}%)` : "0";
}

export {
  birthDateIssue,
  birthDateKeyOf,
  DRIVER_MIN_AGE,
  hasTurned,
  CNH_CATEGORIES,
  CNH_CATEGORY_NONE,
  CNH_CATEGORY_OPTIONS,
  CNH_STATUS_META,
  DRIVER_CONTRACT_LABELS,
  DRIVER_STATUS_LABELS,
  changedDriverFields,
  cnhExpiryIssue,
  countWithShare,
  dateOnlyKeyOf,
  driverFormValuesOf,
  driverStatsData,
  scopedDriverBusinessId,
  type CnhCategory,
  type CnhStatus,
  type DriverFormValues,
  type DriverListSearchMeta,
  type DriverRecordForForm,
  type DriverScope,
};
