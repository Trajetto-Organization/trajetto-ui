/**
 * What the AI quota pays for, in the company's own modules (DASH-MOD-1), and
 * since ADR 0010 (05/10/2026) what the automatic reading actually reads.
 *
 * One quota covers the fleet readings (odometer of fuelings and of the
 * checklist) and the receipt of Entregas. The reading runs on Trajetto's own
 * infrastructure (no external provider) and covers only what OCR can read:
 * the odometer, the invoice number and the receiving date. The signature,
 * the fuel gauge, tyres and condition stay with the company's team and cost
 * nothing. Before the plan is known nothing is claimed.
 * No directive: pure, and tested.
 */
interface PlanModule {
  module: string;
  enabled: boolean;
}

const UNKNOWN =
  "Leitura automática das fotos enviadas pelo aplicativo, feita na infraestrutura da Trajetto.";

const FLEET_SCOPE =
  "Leitura automática do odômetro nos abastecimentos e no checklist, feita na infraestrutura da Trajetto.";

const DELIVERIES_SCOPE =
  "Leitura automática do canhoto (número da NF e data de recebimento), feita na infraestrutura da Trajetto. A assinatura segue para conferência da sua equipe.";

/**
 * Under the bar: what counts and what never does. The device pre-check
 * sentence (design P6.1) waits for the pre-check itself (P5/P7): the page
 * must not describe a feature that is not shipped.
 */
const AI_QUOTA_NOTE =
  "Cada foto lida conta uma vez. Itens do checklist como combustível, pneus e condição não são lidos automaticamente e não contam.";

/**
 * The note without the checklist sentence, for a company without Gestão de
 * Frotas (or a plan not known yet): the checklist is a fleet screen it never
 * sees, so naming it was the fleet leaking into Entregas.
 */
const AI_QUOTA_NOTE_WITHOUT_FLEET = "Cada foto lida conta uma vez.";

function enabledModules(
  modules: readonly PlanModule[] | null | undefined,
): Set<string> {
  return new Set(
    (modules ?? [])
      .filter((entry) => entry.enabled)
      .map((entry) => entry.module),
  );
}

function aiQuotaNote(
  modules: readonly PlanModule[] | null | undefined,
): string {
  return enabledModules(modules).has("FLEET")
    ? AI_QUOTA_NOTE
    : AI_QUOTA_NOTE_WITHOUT_FLEET;
}

/**
 * The "Consulta de Multas" card: fines are Gestão de Frotas, so it exists
 * only for a company with that module. Unknown plan: hidden — the card is a
 * "not in this version" notice, nothing is lost by waiting.
 */
function showsFineLookupCard(
  modules: readonly PlanModule[] | null | undefined,
): boolean {
  return enabledModules(modules).has("FLEET");
}

/**
 * The plan the limits page reads. The entitlements answer first; when it is
 * missing, a company user's session already knows its company's modules
 * (the MASTER's session lists every module, so it never stands in for the
 * selected company).
 */
function limitsPlanModules(
  planModules: readonly PlanModule[] | null | undefined,
  mode: "admin" | "dashboard",
  sessionModules: readonly string[] | null | undefined,
): readonly PlanModule[] | null {
  if (planModules) return planModules;
  if (mode !== "dashboard" || !sessionModules) return null;

  return sessionModules.map((module) => ({ module, enabled: true }));
}

function aiQuotaScope(
  modules: readonly PlanModule[] | null | undefined,
): string {
  const enabled = enabledModules(modules);

  const fleet = enabled.has("FLEET");
  const deliveries = enabled.has("DELIVERIES");

  if (fleet && deliveries) return `${FLEET_SCOPE} ${DELIVERIES_SCOPE}`;
  if (fleet) return FLEET_SCOPE;
  if (deliveries) return DELIVERIES_SCOPE;

  return UNKNOWN;
}

export {
  AI_QUOTA_NOTE,
  AI_QUOTA_NOTE_WITHOUT_FLEET,
  aiQuotaNote,
  aiQuotaScope,
  limitsPlanModules,
  showsFineLookupCard,
};
