/**
 * The "Verificação IA" badge of a checklist: the live analysis when one is
 * running or just finished, the stored verdict otherwise. No directive:
 * pure, and tested (tests/unitaires/checklist-ai-status.test.ts).
 *
 * A "verified" whose km was read without a fraud check (the OCR reader, ADR
 * 0010 §5) only means the km read agrees with the km typed: "Km confere", in
 * a neutral badge, never the green seal.
 */
const CHECKLIST_AI_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  analyzing: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
  verified: "bg-green-100 text-green-800 border-green-200",
  issues_found: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-700 border-red-200",
  skipped: "bg-gray-50 text-gray-500 border-gray-100",
};

const CHECKLIST_AI_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  analyzing: "Analisando...",
  verified: "Verificado IA",
  issues_found: "Problemas Encontrados",
  error: "Erro",
  skipped: "Não Analisado",
};

const KM_MATCHES_LABEL = "Km confere";
const KM_MATCHES_CLASS = "bg-slate-100 text-slate-700 border-slate-200";

interface ChecklistAIRecord {
  ai_verification_status?: string | null;
  /** Field key → outcome; older rows stored it as a JSON string. */
  ai_verification_details?: unknown;
}

interface ChecklistAIRealtimeEvent {
  step: string;
  overallStatus?: string;
  currentResult?: { fraudAssessed?: boolean; details?: string };
}

interface ChecklistAIBadge {
  label: string;
  className: string;
  /** The reading's own sentence, for the badge's tooltip. */
  title?: string;
}

function storedFields(details: unknown): Record<string, unknown> {
  if (!details) return {};

  if (typeof details === "string") {
    try {
      const parsed: unknown = JSON.parse(details);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return typeof details === "object"
    ? (details as Record<string, unknown>)
    : {};
}

/** Whether any stored field was read without a fraud check. */
function storedFraudUnassessed(details: unknown): boolean {
  return Object.values(storedFields(details)).some(
    (outcome) =>
      Boolean(outcome) &&
      typeof outcome === "object" &&
      (outcome as { fraudAssessed?: unknown }).fraudAssessed === false,
  );
}

function checklistAIStatusBadge(
  record: ChecklistAIRecord,
  realtimeEvent: ChecklistAIRealtimeEvent | undefined,
): ChecklistAIBadge {
  const isTerminal =
    realtimeEvent?.step === "completed" || realtimeEvent?.step === "skipped";

  const status = realtimeEvent
    ? isTerminal
      ? realtimeEvent.overallStatus || record.ai_verification_status
      : "analyzing"
    : record.ai_verification_status;

  if (!status) {
    return {
      label: CHECKLIST_AI_STATUS_LABELS.skipped,
      className: CHECKLIST_AI_STATUS_COLORS.skipped,
    };
  }

  if (status === "verified") {
    // The live result when the analysis just finished, the stored one otherwise.
    const live =
      realtimeEvent && isTerminal ? realtimeEvent.currentResult : undefined;
    const unassessed = live
      ? live.fraudAssessed === false
      : storedFraudUnassessed(record.ai_verification_details);

    if (unassessed) {
      return {
        label: KM_MATCHES_LABEL,
        className: KM_MATCHES_CLASS,
        ...(live?.details ? { title: live.details } : {}),
      };
    }
  }

  return {
    label: CHECKLIST_AI_STATUS_LABELS[status] || status,
    className:
      CHECKLIST_AI_STATUS_COLORS[status] || CHECKLIST_AI_STATUS_COLORS.pending,
  };
}

export { checklistAIStatusBadge, type ChecklistAIBadge };
