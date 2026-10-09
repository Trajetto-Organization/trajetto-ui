import { listApiKeys } from "@/actions/integration";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

/**
 * The API keys list, shared by the keys panel and the screen's access check.
 *
 * The keys list is the cheapest read behind the same gates as every
 * integrations route (module, permission, tenant), so the screen asks it —
 * under the panel's own cache key, one request for both — whether to draw the
 * panels at all.
 */
const apiKeysQueryKey = (businessId: string) =>
  ["integration_api_keys", businessId] as const;

async function fetchApiKeys(businessId: string) {
  const answer = await listApiKeys(businessId || undefined);

  if (isStaleActionResult(answer, { background: true })) {
    throw new Error(STALE_ACTION_MESSAGE);
  }

  return answer;
}

export { apiKeysQueryKey, fetchApiKeys };
