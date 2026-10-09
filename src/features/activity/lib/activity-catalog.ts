/**
 * The activity trail's catalog on the web: the statuses and types the API
 * records, their module and how they read (FLEET-ACT-2/4).
 *
 * ONE source for the table, the timeline and the filters. The values and
 * modules mirror trajetto-api src/modules/activity/activity-catalog.ts (a
 * unit test compares both files); the tones are the web's. The status map
 * used to be copied four times, knew nine of some thirty statuses, and
 * painted "Entregue" or "Planejada" in the grey of the unknown.
 *
 * No directive: the server content and client components both import it.
 */

type ActivityModule = "CORE" | "FLEET" | "DELIVERIES";

type BadgeTone =
  | "green"
  | "emerald"
  | "slate"
  | "red"
  | "blue"
  | "yellow"
  | "indigo"
  | "gray"
  | "sky"
  | "violet"
  | "orange"
  | "teal";

interface ActivityStatusEntry {
  value: string;
  module: ActivityModule;
  tone: BadgeTone;
  /** Other spellings rows already carry ("Em Rota", "PLANNED"…). */
  aliases?: readonly string[];
}

const ACTIVITY_STATUS_CATALOG: readonly ActivityStatusEntry[] = [
  { value: "Completo", module: "CORE", tone: "emerald" },
  { value: "Criado", module: "CORE", tone: "green" },
  { value: "Atualizado", module: "CORE", tone: "indigo" },
  { value: "Deletado", module: "CORE", tone: "red" },
  { value: "Pendente", module: "CORE", tone: "yellow", aliases: ["PENDING"] },
  { value: "Ativo", module: "CORE", tone: "green", aliases: ["ACTIVE"] },
  { value: "Inativo", module: "CORE", tone: "slate", aliases: ["INACTIVE"] },
  { value: "Bloqueado", module: "CORE", tone: "red", aliases: ["BLOCKED"] },
  {
    value: "Em rota",
    module: "DELIVERIES",
    tone: "blue",
    aliases: ["Em Rota", "IN_TRANSIT", "IN_ROUTE"],
  },
  {
    value: "Entregue",
    module: "DELIVERIES",
    tone: "emerald",
    aliases: ["DELIVERED"],
  },
  {
    value: "Insucesso",
    module: "DELIVERIES",
    tone: "red",
    aliases: ["FAILED"],
  },
  {
    value: "Cancelada",
    module: "DELIVERIES",
    tone: "gray",
    aliases: ["CANCELLED"],
  },
  {
    value: "Planejada",
    module: "DELIVERIES",
    tone: "sky",
    aliases: ["PLANNED"],
  },
  {
    value: "Liberada",
    module: "DELIVERIES",
    tone: "violet",
    aliases: ["RELEASED"],
  },
  {
    value: "Em andamento",
    module: "DELIVERIES",
    tone: "blue",
    aliases: ["IN_PROGRESS"],
  },
  {
    value: "Concluída",
    module: "DELIVERIES",
    tone: "emerald",
    aliases: ["COMPLETED"],
  },
  {
    value: "Aprovado",
    module: "DELIVERIES",
    tone: "green",
    aliases: ["APPROVED"],
  },
  {
    value: "Rejeitado",
    module: "DELIVERIES",
    tone: "red",
    aliases: ["REJECTED"],
  },
  { value: "Importada", module: "DELIVERIES", tone: "teal" },
  { value: "Estornada", module: "DELIVERIES", tone: "orange" },
  { value: "Ativa", module: "DELIVERIES", tone: "green" },
  { value: "Revogada", module: "DELIVERIES", tone: "red" },
  { value: "Desativado", module: "DELIVERIES", tone: "slate" },
  { value: "Pausado", module: "DELIVERIES", tone: "yellow" },
  { value: "Segredo trocado", module: "DELIVERIES", tone: "indigo" },
  { value: "Removido", module: "DELIVERIES", tone: "red" },
];

interface ActivityTypeEntry {
  value: string;
  module: ActivityModule;
}

const ACTIVITY_TYPE_CATALOG: readonly ActivityTypeEntry[] = [
  { value: "Empresa", module: "CORE" },
  { value: "Plano", module: "CORE" },
  { value: "Filial", module: "CORE" },
  { value: "Usuário", module: "CORE" },
  { value: "Perfil de acesso", module: "CORE" },
  { value: "Permissão", module: "CORE" },
  { value: "Card Kanban", module: "CORE" },
  { value: "Veículo", module: "CORE" },
  { value: "Motorista", module: "CORE" },
  { value: "Tipo de veículo", module: "CORE" },
  { value: "Tipo de combustível", module: "CORE" },
  { value: "Abastecimento", module: "FLEET" },
  { value: "Checklist Veicular", module: "FLEET" },
  { value: "Ordem de serviço", module: "FLEET" },
  { value: "Peça", module: "FLEET" },
  { value: "Peça da ordem de serviço", module: "FLEET" },
  { value: "Fornecedor", module: "FLEET" },
  { value: "Conta a pagar", module: "FLEET" },
  { value: "Multa", module: "FLEET" },
  { value: "Entrega", module: "DELIVERIES" },
  { value: "Rota", module: "DELIVERIES" },
  { value: "Integração", module: "DELIVERIES" },
];

const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  create: "Criar",
  update: "Atualizar",
  delete: "Excluir",
};

/**
 * Who acted, as the reader sees it (the API presents it): DRIVER is the
 * driver in the app, PLATFORM the Trajetto team as a company sees it.
 */
const ACTIVITY_ROLE_LABELS: Record<string, string> = {
  MASTER: "Master",
  BUSINESS_ADMIN: "Admin",
  BUSINESS_USER: "Colaborador",
  DRIVER: "Motorista",
  PLATFORM: "Trajetto",
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  emerald:
    "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  slate: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
  red: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
  sky: "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200",
};

const UNKNOWN_CLASS =
  "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";

const ROLE_CLASSES: Record<string, string> = {
  MASTER: TONE_CLASSES.violet,
  BUSINESS_ADMIN: TONE_CLASSES.blue,
  BUSINESS_USER: TONE_CLASSES.gray,
  DRIVER: TONE_CLASSES.orange,
  PLATFORM: TONE_CLASSES.teal,
};

const ACTION_CLASSES: Record<string, string> = {
  create: TONE_CLASSES.green,
  update: TONE_CLASSES.yellow,
  delete: TONE_CLASSES.red,
};

function statusEntry(
  status: string | null | undefined,
): ActivityStatusEntry | undefined {
  if (!status) return undefined;

  return ACTIVITY_STATUS_CATALOG.find(
    (entry) => entry.value === status || entry.aliases?.includes(status),
  );
}

/** How a stored status reads: its canonical label ("PLANNED" → "Planejada"). */
function activityStatusLabel(status: string | null | undefined): string {
  return statusEntry(status)?.value ?? status ?? "";
}

/** The badge class of a status, legacy spellings included. */
function activityStatusClass(status: string | null | undefined): string {
  const entry = statusEntry(status);

  return entry ? TONE_CLASSES[entry.tone] : UNKNOWN_CLASS;
}

function activityRoleClass(role: string | null | undefined): string {
  return ROLE_CLASSES[role ?? ""] ?? ROLE_CLASSES.BUSINESS_USER;
}

function activityActionClass(action: string | null | undefined): string {
  return ACTION_CLASSES[action ?? ""] ?? ACTION_CLASSES.update;
}

/**
 * Whether an option of a module is offered (FLEET-ACT-4): CORE always; a
 * module's options only when the company hired it. The MASTER sees them all
 * — the /admin trail spans every company. The ROWS never hide: the trail is
 * an audit record, even of a module switched off later.
 */
function isModuleOffered(
  module: ActivityModule,
  enabledModules: readonly string[] | null | undefined,
  isMaster: boolean,
): boolean {
  if (module === "CORE" || isMaster) return true;

  return Boolean(enabledModules?.includes(module));
}

interface ActivityFilterOption {
  value: string;
  label: string;
}

function activityStatusOptions(
  enabledModules: readonly string[] | null | undefined,
  isMaster: boolean,
): ActivityFilterOption[] {
  return ACTIVITY_STATUS_CATALOG.filter((entry) =>
    isModuleOffered(entry.module, enabledModules, isMaster),
  ).map((entry) => ({ value: entry.value, label: entry.value }));
}

function activityTypeOptions(
  enabledModules: readonly string[] | null | undefined,
  isMaster: boolean,
): ActivityFilterOption[] {
  return ACTIVITY_TYPE_CATALOG.filter((entry) =>
    isModuleOffered(entry.module, enabledModules, isMaster),
  ).map((entry) => ({ value: entry.value, label: entry.value }));
}

/**
 * The author roles a reader can filter by: a company never sees a MASTER
 * as such (the API presents it as PLATFORM), and the MASTER sees no
 * PLATFORM (it audits real identities).
 */
function activityRoleOptions(isMaster: boolean): ActivityFilterOption[] {
  const roles = isMaster
    ? ["MASTER", "BUSINESS_ADMIN", "BUSINESS_USER", "DRIVER"]
    : ["BUSINESS_ADMIN", "BUSINESS_USER", "DRIVER", "PLATFORM"];

  return roles.map((value) => ({ value, label: ACTIVITY_ROLE_LABELS[value] }));
}

export {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ROLE_LABELS,
  ACTIVITY_STATUS_CATALOG,
  ACTIVITY_TYPE_CATALOG,
  activityActionClass,
  activityRoleClass,
  activityRoleOptions,
  activityStatusClass,
  activityStatusLabel,
  activityStatusOptions,
  activityTypeOptions,
  isModuleOffered,
  type ActivityFilterOption,
  type ActivityModule,
};
