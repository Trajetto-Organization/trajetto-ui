import { create } from "zustand";

interface AIVerificationResult {
  status: string;
  details: string;

  /** 0–1 (the API's one scale since AI-3). */
  confidence?: number;
  aiReadValue?: number;
  reportedValue?: number;
  fieldsAnalyzed?: number;
  fieldResults?: Record<string, any>;

  /**
   * False when the reading did not judge fraud (the local OCR reader, ADR
   * 0010 §5): "verified" then only means the km agrees. Absent: judged.
   */
  fraudAssessed?: boolean;
}

interface AIVerificationEvent {
  /** "proof" is a receipt (AI-7): the driver's, not a web screen's. */
  recordType: "fuel" | "checklist" | "proof";
  recordId: string;
  businessId?: string;
  step: string;
  stepNumber: number;
  totalSteps: number;
  overallStatus?: string;
  currentResult?: AIVerificationResult;
  fieldName?: string;
  message?: string;
  timestamp: string;
}

interface BusinessUsageData {
  /** Photos analysed — running analyses ride in inProgress. */
  used: number;
  inProgress?: number;
  limit: number;
  remaining: number;

  /** When the quota resets next (the socket's `resetAt`). */
  resetAt: string | null;

  /** When this tab heard it (stamped by the store), to rank it against a fetch. */
  receivedAt?: number;
}

/** Photos analysed this period, per kind of record (AI-10). */
interface UsageByType {
  fuel: number;
  checklist: number;
  proof: number;
}

/** The usage as the API's `get-ai-usage` answers it. */
interface UsageSnapshot {
  ai_analysis_limit: number;
  ai_analysis_used: number;
  ai_analysis_in_progress?: number;

  /** When the current period began (00:00 of day 1, company zone). */
  ai_analysis_reset_at: string | null;

  /** When it resets (00:00 of next month's day 1, company zone). */
  ai_analysis_next_reset_at?: string | null;
  ai_analysis_timezone?: string | null;
  ai_analysis_used_by_type?: UsageByType;
}

/**
 * The newer of the server's answer and the socket's last event.
 *
 * The socket used to win unconditionally, so once one AI analysis had run on
 * the tab, a limit the MASTER raised never showed — "Atualizar" fetched
 * it and the older event covered it (DLVP-ADM-2). `serverAskedAt` is when the
 * request behind `server` left: an event heard after that may be newer than
 * the answer; one heard before it, or in the same millisecond, is not — the
 * server reads the database after its request leaves (a tie used to go to
 * the socket, and a fast machine showed the old limit after Atualizar).
 *
 * The socket's `resetAt` is the NEXT reset; it used to be written over the
 * period's START (`ai_analysis_reset_at`), so "Último reset" showed next
 * month's date after one analysis.
 */
function freshestUsage(
  server: UsageSnapshot | null,
  serverAskedAt: number,
  realtime: BusinessUsageData | undefined,
): UsageSnapshot | null {
  if (!realtime) return server;
  if (server && (realtime.receivedAt ?? 0) <= serverAskedAt) return server;

  return {
    ai_analysis_used: realtime.used,
    ai_analysis_in_progress: realtime.inProgress ?? 0,
    ai_analysis_limit: realtime.limit,
    ai_analysis_reset_at: server?.ai_analysis_reset_at ?? null,
    ai_analysis_next_reset_at:
      realtime.resetAt || server?.ai_analysis_next_reset_at || null,
    ai_analysis_timezone: server?.ai_analysis_timezone ?? null,

    // The breakdown only comes from the server; the socket carries totals.
    ai_analysis_used_by_type: server?.ai_analysis_used_by_type,
  };
}

interface AIVerificationState {
  verifications: Map<string, AIVerificationEvent>;
  businessUsage: Map<string, BusinessUsageData>;
  updateVerification: (event: AIVerificationEvent) => void;
  getVerification: (recordId: string) => AIVerificationEvent | undefined;
  updateBusinessUsage: (businessId: string, usage: BusinessUsageData) => void;
  clearVerification: (recordId: string) => void;
  clearAll: () => void;
}

const useAIVerificationStore = create<AIVerificationState>()((set, get) => ({
  verifications: new Map(),
  businessUsage: new Map(),
  updateVerification: (event) => {
    set((state) => {
      const newMap = new Map(state.verifications);
      newMap.set(event.recordId, event);

      return { verifications: newMap };
    });
  },
  getVerification: (recordId) => {
    return get().verifications.get(recordId);
  },
  updateBusinessUsage: (businessId, usage) => {
    set((state) => {
      const newMap = new Map(state.businessUsage);

      newMap.set(businessId, { ...usage, receivedAt: Date.now() });
      return { businessUsage: newMap };
    });
  },
  clearVerification: (recordId) => {
    set((state) => {
      const newMap = new Map(state.verifications);
      newMap.delete(recordId);

      return { verifications: newMap };
    });
  },
  clearAll: () => {
    set({ verifications: new Map(), businessUsage: new Map() });
  },
}));

export { useAIVerificationStore, freshestUsage };
export type {
  AIVerificationEvent,
  AIVerificationResult,
  BusinessUsageData,
  UsageByType,
  UsageSnapshot,
};
