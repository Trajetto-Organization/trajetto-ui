import { relayUrl } from "@/lib/api-relay-paths";
import { relayJson } from "@/lib/relay-read";

import type { AIUsageData } from "@/actions/business/get-ai-usage";
import type { BusinessEntitlementsData } from "@/actions/business/entitlements";

/**
 * A company's AI quota and plan, read from the browser through the relay
 * (lib/relay-read).
 *
 * Server Actions until now, and Next 14 runs those one at a time: Limites
 * asked for the usage and the plan "together" and got them one after the
 * other, after whatever the page had already queued. Same paths, same
 * token; the writes (limits, modules) stay Server Actions.
 */

interface ReadOptions {
  signal?: AbortSignal;
}

async function fetchAIUsage(
  businessId: string,
  { signal }: ReadOptions = {},
): Promise<AIUsageData> {
  const answer = await relayJson<{ data: AIUsageData }>(
    relayUrl(`/business/get-ai-usage/${encodeURIComponent(businessId)}`),
    {
      signal,
      errorMessage:
        "Houve um erro ao tentar obter os dados de uso da verificação IA.",
    },
  );

  return answer.data;
}

async function fetchBusinessEntitlements(
  businessId: string,
  { signal }: ReadOptions = {},
): Promise<BusinessEntitlementsData> {
  const answer = await relayJson<{ data: BusinessEntitlementsData }>(
    relayUrl(`/business/entitlements/${encodeURIComponent(businessId)}`),
    {
      signal,
      errorMessage: "Houve um erro ao obter os módulos da empresa.",
    },
  );

  return answer.data;
}

export { fetchAIUsage, fetchBusinessEntitlements };
