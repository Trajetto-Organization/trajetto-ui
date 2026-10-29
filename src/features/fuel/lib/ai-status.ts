/**
 * The "Verificação IA" badge of a refueling: the live analysis when one is
 * running or just finished, the stored verdict otherwise, and — for a row
 * without a verdict — the stored `odometer_verified` boolean.
 *
 * The admin copy passed the status string where that boolean belonged, so a
 * row without a verdict drew an empty badge; the dashboard copy always said
 * "Não Analisado". No directive: pure, and tested.
 */
const AI_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  analyzing: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
  verified: "bg-green-100 text-green-800 border-green-200",
  mismatch: "bg-yellow-100 text-yellow-800 border-yellow-200",
  fraud: "bg-red-100 text-red-800 border-red-200",
  unreadable: "bg-orange-100 text-orange-800 border-orange-200",
  error: "bg-red-100 text-red-700 border-red-200",
  skipped: "bg-gray-50 text-gray-500 border-gray-100",
};

const AI_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  analyzing: "Analisando...",
  verified: "Verificado IA",
  mismatch: "Divergente",
  fraud: "Suspeita Fraude",
  unreadable: "Ilegível",
  error: "Erro",
  skipped: "Não Analisado",
};

/**
 * A "verified" from a reader that cannot judge fraud (the OCR reader, ADR
 * 0010 §5) only means the km read agrees with the km typed: a neutral badge,
 * never the green seal.
 */
const KM_MATCHES_LABEL = "Km confere";
const KM_MATCHES_CLASS = "bg-slate-100 text-slate-700 border-slate-200";

interface FuelAIDetails {
  fraudAssessed?: boolean;
  details?: string;
}

interface FuelAIRecord {
  odometer_ai_status?: string | null;
  odometer_verified: boolean;
  odometer_ai_details?: FuelAIDetails | null;
}

interface AIRealtimeEvent {
  step: string;
  overallStatus?: string;
  currentResult?: { fraudAssessed?: boolean; details?: string };
}

interface FuelAIBadge {
  label: string;
  className: string;
  /** The reading's own sentence, for the badge's tooltip. */
  title?: string;
}

function fuelAIStatusBadge(
  fuel: FuelAIRecord,
  realtimeEvent: AIRealtimeEvent | undefined,
): FuelAIBadge {
  const isTerminal =
    realtimeEvent?.step === "completed" || realtimeEvent?.step === "skipped";

  const status = realtimeEvent
    ? isTerminal
      ? realtimeEvent.overallStatus || fuel.odometer_ai_status
      : "analyzing"
    : fuel.odometer_ai_status;

  if (!status) {
    return fuel.odometer_verified
      ? {
          label: "Verificado",
          className: "border-green-200 bg-green-100 text-green-800",
        }
      : {
          label: "Não verificado",
          className: "border-red-200 bg-red-100 text-red-800",
        };
  }

  if (status === "verified") {
    // The live result when the analysis just finished, the stored one otherwise.
    const reading =
      realtimeEvent && isTerminal && realtimeEvent.currentResult
        ? realtimeEvent.currentResult
        : fuel.odometer_ai_details;

    if (reading?.fraudAssessed === false) {
      return {
        label: KM_MATCHES_LABEL,
        className: KM_MATCHES_CLASS,
        ...(reading.details ? { title: reading.details } : {}),
      };
    }
  }

  return {
    label: AI_STATUS_LABELS[status] || status,
    className: AI_STATUS_COLORS[status] || AI_STATUS_COLORS.pending,
  };
}

export { fuelAIStatusBadge, type FuelAIBadge };
