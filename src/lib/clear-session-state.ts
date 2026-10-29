import { queryClientProps } from "@/lib/query-client-props";
import { disconnectSocket } from "@/socket";

import { useAIVerificationStore } from "@/store/ai-verification-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Drops everything about the previous user that lives in this tab's memory.
 *
 * Called by the login page when it mounts, so no session starts on top of
 * another one's leftovers. Both ways out of a session ("Sair" and the forced
 * logout) leave through `leaveSession` below, with a full load, and do not
 * call this: emptying the cache under a mounted protected tree makes it
 * rebuild its queries and ask the API again on the way out.
 *
 * The login page still needs it because not every arrival there is a full
 * load. The QueryClient is created in a module body (`query-client-props.ts`),
 * so it lives as long as the JS runtime; a soft navigation to /login (a
 * redirect from a Server Action, a link, a tab from an older build) keeps it,
 * with every query of the previous user inactive for the 30-minute
 * `cacheTime`. The next person to log in on that tab would be served them.
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

/**
 * The way out of a session (decision 2.6): "Sair" and the forced logout
 * (`force-logout.ts`) both end here, with a full load, never a soft one.
 *
 * Clearing the cache and letting the router move on, as the first cut did,
 * emptied it under the protected tree that was still mounted: the next
 * render rebuilt each observer's query and fired it again, with no
 * credential, on the way out. A full load drops this tab's memory —
 * QueryClient, stores, socket — with the document instead, and nothing is
 * left observing.
 *
 * Only what outlives the document is cleared by hand: the role and
 * permissions persisted by the auth store, which a tab closed before /login
 * loads would otherwise keep. The in-memory copy is left alone so nothing
 * re-renders in between. The socket goes first, so no event of the ending
 * session lands meanwhile (a second call is a no-op).
 */
function leaveSession(destination: string): void {
  sessionExiting = true;
  disconnectSocket();
  useAuthStore.persist.clearStorage();

  window.location.assign(destination);
}

/**
 * Set from the moment "Sair" is pressed until the tab is gone (or the logout
 * failed). The API announces the revocation on this session's socket room
 * (`securityAction` "logout") while the logout action is still answering;
 * the tab that asked for it used to treat that as "re-check the session",
 * fire `readSessionClaims` with the cookies already deleted (middleware 307
 * -> POST /login) and navigate to a bare /login over its own
 * /login?reason=logout, the leftover request dying as "Error: aborted" in
 * the Next terminal. Nothing re-checks a session this tab is ending.
 */
let sessionExiting = false;

function beginSessionExit(): void {
  sessionExiting = true;
}

/** The logout failed: the session is still this tab's, checks resume. */
function cancelSessionExit(): void {
  sessionExiting = false;
}

function isSessionExiting(): boolean {
  return sessionExiting;
}

export {
  beginSessionExit,
  cancelSessionExit,
  clearSessionState,
  isSessionExiting,
  leaveSession,
};
