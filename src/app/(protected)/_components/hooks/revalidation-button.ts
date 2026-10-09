import { useRefreshRateLimit } from "../shared/tanstack-table/data-table-revalidate/hooks";

import type { RateLimitConfig } from "../shared/common.types";

/**
 * The overview's and Kanban's refresh buttons: the same limit as every other
 * refresh button, kept under their own storage key by default.
 *
 * This file used to be a 260-line copy of that limit, and the two copies had
 * already drifted (the table one had cooldown fixes this one never got).
 */
export function useButtonRefreshRateLimit(rateLimit: RateLimitConfig = {}) {
  return useRefreshRateLimit({
    ...rateLimit,
    storageKey: rateLimit.storageKey ?? "revalidate-button-rate-limit",
  });
}
