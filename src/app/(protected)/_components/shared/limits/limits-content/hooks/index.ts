import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { useAIVerificationStore } from "@/store/ai-verification-store";
import { getAIUsage, type AIUsageData } from "@/actions/business/get-ai-usage";

import {
  getBusinessEntitlements,
  type BusinessEntitlementsData,
} from "@/actions/business/entitlements";

import type { UseLimitsContent } from "../limits-content.types";

function useLimitsContent({ businessId: businessIdProp }: UseLimitsContent) {
  const searchParams = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  const urlBusinessId = searchParams.get("businessId");
  const businessId =
    businessIdProp || urlBusinessId || storeBusinessId || undefined;

  const [serverUsage, setServerUsage] = useState<AIUsageData | null>(null);
  const [entitlements, setEntitlements] =
    useState<BusinessEntitlementsData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Real-time usage from WebSocket events (reactive selector)
  const realtimeUsage = useAIVerificationStore((s) =>
    businessId ? s.businessUsage.get(businessId) : undefined,
  );

  // Merge: real-time takes priority over server data
  const aiUsage: AIUsageData | null = realtimeUsage
    ? {
        ai_analysis_used: realtimeUsage.used,
        ai_analysis_in_progress: realtimeUsage.inProgress ?? 0,
        ai_analysis_limit: realtimeUsage.limit,
        ai_analysis_reset_at:
          realtimeUsage.resetAt || serverUsage?.ai_analysis_reset_at || null,
      }
    : serverUsage;

  // Listen for revalidation button clicks to re-fetch data
  useEffect(() => {
    const handler = () => setRefreshTrigger((prev) => prev + 1);

    window.addEventListener("data-revalidated", handler);
    return () => window.removeEventListener("data-revalidated", handler);
  }, []);

  useEffect(() => {
    if (!businessId) return;

    setIsLoading(true);
    setServerUsage(null);

    setErrorMessage(null);

    getAIUsage(businessId)
      .then((response) => {
        if (response.success && response.data) {
          setServerUsage(response.data);
        } else {
          setErrorMessage(response.message);
        }
      })
      .finally(() => setIsLoading(false));

    // The company's plan (modules + contracted fleet) rides along: same
    // page, same refresh triggers.
    void getBusinessEntitlements(businessId).then((response) => {
      setEntitlements(response.success ? (response.data ?? null) : null);
    });
  }, [businessId, refreshTrigger]);

  return { isLoading, errorMessage, aiUsage, entitlements, businessId };
}

export { useLimitsContent };
