import { create } from "zustand";

interface AIVerificationResult {
  status: string;
  details: string;
  confidence: number;
  aiReadValue?: number;
  reportedValue?: number;
  fieldsAnalyzed?: number;
  fieldResults?: Record<string, any>;
}

interface AIVerificationEvent {
  recordType: "fuel" | "checklist";
  recordId: string;
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
  /** Completed verifications only — running analyses ride in inProgress. */
  used: number;
  inProgress?: number;
  limit: number;
  remaining: number;
  resetAt: string | null;
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

      newMap.set(businessId, usage);
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

export { useAIVerificationStore };
export type { AIVerificationEvent, AIVerificationResult, BusinessUsageData };
