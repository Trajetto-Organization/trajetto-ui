import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";
import { readBusinessIdParam } from "@/lib/business-id-param";

import {
  freshestUsage,
  useAIVerificationStore,
} from "@/store/ai-verification-store";
import { DATA_REVALIDATED_EVENT } from "@/lib/refresh-client-cache";
import { AI_USAGE_CHANGED_EVENT } from "@/lib/ai-analysis-sync";
import type { AIUsageData } from "@/actions/business/get-ai-usage";
import type { BusinessEntitlementsData } from "@/actions/business/entitlements";

import { fetchAIUsage, fetchBusinessEntitlements } from "@/lib/business-reads";

import type { UseLimitsContent } from "../limits-content.types";

function useLimitsContent({ businessId: businessIdProp }: UseLimitsContent) {
  const searchParams = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  // Only a company id from the URL: it becomes a segment of API paths.
  const urlBusinessId = readBusinessIdParam(searchParams.get("businessId"));
  const businessId =
    businessIdProp || urlBusinessId || storeBusinessId || undefined;

  // With the moment its request left, to rank it against socket events, and
  // the company it is about: after a switch on /admin the previous company's
  // answer is never read as the new one's (decision 2.6).
  const [serverUsage, setServerUsage] = useState<{
    businessId: string;
    usage: AIUsageData;
    askedAt: number;
  } | null>(null);
  const [plan, setPlan] = useState<{
    businessId: string;
    data: BusinessEntitlementsData | null;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Real-time usage from WebSocket events (reactive selector)
  const realtimeUsage = useAIVerificationStore((s) =>
    businessId ? s.businessUsage.get(businessId) : undefined,
  );

  const currentUsage =
    serverUsage && serverUsage.businessId === businessId ? serverUsage : null;

  const aiUsage: AIUsageData | null = freshestUsage(
    currentUsage?.usage ?? null,
    currentUsage?.askedAt ?? 0,
    realtimeUsage,
  );

  const entitlements =
    plan && plan.businessId === businessId ? plan.data : null;

  // Listen for revalidation button clicks to re-fetch data
  useEffect(() => {
    const handler = () => setRefreshTrigger((prev) => prev + 1);

    window.addEventListener(DATA_REVALIDATED_EVENT, handler);
    return () => window.removeEventListener(DATA_REVALIDATED_EVENT, handler);
  }, []);

  // An analysis of this company ended somewhere (AI-6): the usage moved.
  // Quietly — the card keeps its numbers until the new ones arrive, instead
  // of flashing the spinner at every analysis of the company — and a burst
  // is one fetch, a couple of seconds later.
  useEffect(() => {
    if (!businessId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const abort = new AbortController();

    const refetchQuietly = () => {
      const askedAt = Date.now();

      fetchAIUsage(businessId, { signal: abort.signal }).then(
        (usage) => {
          if (abort.signal.aborted) return;

          setServerUsage({ businessId, usage, askedAt });
        },
        // Quiet on purpose: the card keeps the numbers it has.
        () => undefined,
      );
    };

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string }>).detail;
      if (detail?.businessId !== businessId) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(refetchQuietly, 2_000);
    };

    window.addEventListener(AI_USAGE_CHANGED_EVENT, handler);

    return () => {
      abort.abort();
      if (timer) clearTimeout(timer);
      window.removeEventListener(AI_USAGE_CHANGED_EVENT, handler);
    };
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;

    // An answer that arrives after the company (or the refresh) changed is
    // dropped, and its request cancelled: a late one used to overwrite the
    // newer company's numbers.
    const abort = new AbortController();
    const { signal } = abort;

    setIsLoading(true);
    setServerUsage(null);

    setErrorMessage(null);

    const askedAt = Date.now();

    // Relay GETs (lib/business-reads), so the usage and the plan leave
    // together; as Server Actions the plan waited for the usage to answer.
    fetchAIUsage(businessId, { signal })
      .then(
        (usage) => {
          if (signal.aborted) return;

          setServerUsage({ businessId, usage, askedAt });
        },
        (error: unknown) => {
          if (signal.aborted) return;

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Houve um erro ao tentar obter os dados de uso da verificação IA.",
          );
        },
      )
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    // The company's plan (modules + contracted fleet) rides along: same
    // page, same refresh triggers.
    fetchBusinessEntitlements(businessId, { signal }).then(
      (data) => {
        if (!signal.aborted) setPlan({ businessId, data });
      },
      () => {
        if (!signal.aborted) setPlan({ businessId, data: null });
      },
    );

    return () => {
      abort.abort();
    };
  }, [businessId, refreshTrigger]);

  return { isLoading, errorMessage, aiUsage, entitlements, businessId };
}

export { useLimitsContent };
