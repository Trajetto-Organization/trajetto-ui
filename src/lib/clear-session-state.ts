import { queryClientProps } from "@/lib/query-client-props";

import { useAIVerificationStore } from "@/store/ai-verification-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Drops everything about the previous user that lives in this tab's memory.
 *
 * The leak this closes is structural, not a missing call somewhere. The
 * QueryClient is created in a module body (`query-client-props.ts`), so it is
 * built once per JS runtime — and logging out is a Server Action ending in
 * `redirect()`, which in the App Router is a SOFT navigation. The runtime is
 * never torn down. `<QueryClientProvider>` unmounts with the protected layout,
 * but unmounting a provider does not empty a QueryCache: the queries simply go
 * inactive and sit there for the 30-minute `cacheTime`. The next person to log
 * in on that tab mounts a new provider around the same instance and is served
 * the previous user's data.
 *
 * Nor do the query keys save it. Not one key in the app carries a user id; the
 * best-scoped ones carry `businessId`, so two people at the same carrier
 * collide exactly — `["chat-threads", businessId, search]` hands over the
 * other person's conversation list. Several carry no scope at all:
 * `["account-payables-by-responsible-user"]`, `["business"]`,
 * `["traffic_violation_code"]`.
 *
 * `clear()` is the right operation here rather than `invalidateQueries` or
 * `removeQueries`: invalidating marks data stale but LEAVES it, and stale data
 * is still rendered while a refetch runs — the new user would see the old
 * user's rows for as long as the request takes. `clear()` empties the query
 * and mutation caches outright, which is what "this session is over" means.
 */
function clearSessionState(): void {
  queryClientProps.clear();

  // Not part of react-query, and the same singleton-in-a-module problem: it
  // holds Maps of AI verification results keyed by record and by business.
  // `clearAll` existed since the store was written and nothing ever called it.
  useAIVerificationStore.getState().clearAll();

  // Role, permissions and enabled modules, persisted in localStorage.
  void useAuthStore.getState().logout();
}

export { clearSessionState };
