import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { disconnectSocket } from "@/socket";

import { clearSessionState } from "@/lib/clear-session-state";

import { toast } from "sonner";

import { loginMessageFor } from "../login-messages";

/**
 * Empties the previous session out of this tab, on arrival at the login page.
 *
 * Here, and only here, because this page is where every way out of the app
 * funnels: the logout button and a forced logout (both a full load through
 * leaveSession in lib/clear-session-state), and the middleware's own
 * redirect when a token cannot be renewed.
 *
 * It cannot be done on the way out instead. Clearing while the protected
 * layout is still mounted only tells its live observers to refetch, and they
 * still hold a valid cookie — the cache would refill with exactly the data
 * being cleared, moments before the redirect. By the time this page mounts the
 * cookies are gone and nothing is observing.
 *
 * Unconditional on purpose. The toast effect below runs behind two guards (a
 * recognised `reason`, and a navigation that is not a reload), and arriving
 * without either of those is still arriving logged out.
 */
function useClearPreviousSession() {
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (hasClearedRef.current) return;
    hasClearedRef.current = true;

    // The socket singleton survives a soft navigation the same way the cache
    // does, so it is dropped on the same trigger rather than inside the toast
    // branches. It is a no-op when there was never a connection.
    disconnectSocket();
    clearSessionState();
  }, []);
}

function useLoginMessages() {
  const searchParams = useSearchParams();
  const hasShownRef = useRef(false);

  useClearPreviousSession();

  useEffect(() => {
    const reason = searchParams.get("reason");
    const message = loginMessageFor(reason);

    if (!message) return;
    if (hasShownRef.current) return;

    // Client-triggered redirects (logout button, security checks) set this
    // flag before redirecting. On refresh the flag is already consumed.
    const hasPendingToast = sessionStorage.getItem("pending_login_toast");

    if (hasPendingToast) {
      sessionStorage.removeItem("pending_login_toast");
    } else {
      // Fallback for server-triggered redirects (middleware token refresh failure)
      // These cause full page loads where performance.navigation.type is reliable
      const navEntries = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];

      if (navEntries.length > 0 && navEntries[0].type === "reload") return;
    }

    hasShownRef.current = true;

    const { text, type } = message;

    // Only the message is decided here now. Tearing the session down moved to
    // useClearPreviousSession, which runs whether or not a `reason` arrived —
    // these two branches used to be the only thing calling logout(), so a user
    // landing on /login without a recognised reason, or reloading the page,
    // kept their role and permissions in localStorage.
    if (type === "success") {
      if (reason === "logout") toast.success(text);
    } else {
      toast.error(text);
    }
  }, [searchParams]);
}

export { useLoginMessages };
