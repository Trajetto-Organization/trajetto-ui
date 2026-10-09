import type { QueryClient } from "react-query";

/**
 * The end of an AI analysis, as the company's screens hear it (AI-6).
 *
 * The API sends the full progress only to whoever requested the analysis —
 * almost always the driver, in the app. The admin looking at that fuelling
 * or checklist here never heard it end, and the dialog's durable progress
 * polled "Analisando 8 de 8" forever. Now the end of every analysis also
 * reaches the company's open screens as `aiAnalysisChanged`: kind and id,
 * no reading. Like `catalogChanged`, it only says what to fetch again — the
 * API re-checks permissions on that fetch.
 */
const AI_ANALYSIS_CHANGED_EVENT = "aiAnalysisChanged";

/** Dispatched on window for screens that do not read through react-query. */
const AI_USAGE_CHANGED_EVENT = "ai-usage-changed";

type AIRecordKind = "fuel" | "checklist" | "proof";

interface AIAnalysisChangedEvent {
  businessId: string;
  recordType: AIRecordKind;
  recordId: string;
}

function isAIAnalysisChangedEvent(
  value: unknown,
): value is AIAnalysisChangedEvent {
  if (!value || typeof value !== "object") return false;

  const { businessId, recordType, recordId } = value as Record<string, unknown>;

  return (
    typeof businessId === "string" &&
    businessId.length > 0 &&
    typeof recordId === "string" &&
    recordId.length > 0 &&
    (recordType === "fuel" ||
      recordType === "checklist" ||
      recordType === "proof")
  );
}

/**
 * What changed, fetched again where it is on screen:
 * - the record's durable progress, which the details dialog polls and which
 *   decides the "Verificar com IA" button;
 * - the receipts' review queue of that company, for a proof;
 * - the usage of the quota (the limits card listens on window).
 */
async function applyAIAnalysisChange(
  queryClient: QueryClient,
  event: AIAnalysisChangedEvent,
): Promise<void> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AI_USAGE_CHANGED_EVENT, {
        detail: { businessId: event.businessId },
      }),
    );
  }

  if (event.recordType === "proof") {
    await queryClient.invalidateQueries(["proof_audit", event.businessId]);
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries([
      "ai-analysis-progress",
      event.recordType,
      event.recordId,
    ]),
    queryClient.invalidateQueries(["ai-usage", event.businessId]),
  ]);
}

export {
  AI_ANALYSIS_CHANGED_EVENT,
  AI_USAGE_CHANGED_EVENT,
  applyAIAnalysisChange,
  isAIAnalysisChangedEvent,
};
export type { AIAnalysisChangedEvent, AIRecordKind };
