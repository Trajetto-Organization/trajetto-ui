import { fetchApiKeyList } from "./reads";

/**
 * The API keys list, shared by the keys panel and the screen's access check.
 *
 * The keys list is the cheapest read behind the same gates as every
 * integrations route (module, permission, tenant), so the screen asks it —
 * under the panel's own cache key, one request for both — whether to draw the
 * panels at all. A relay GET (lib/reads): the answer, a refusal included,
 * comes back as a value the screen reads.
 */
const apiKeysQueryKey = (businessId: string) =>
  ["integration_api_keys", businessId] as const;

async function fetchApiKeys(businessId: string, signal?: AbortSignal) {
  return fetchApiKeyList(businessId || undefined, { signal });
}

export { apiKeysQueryKey, fetchApiKeys };
