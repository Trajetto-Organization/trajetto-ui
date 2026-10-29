import { useEffect } from "react";
import { toast } from "sonner";

import { handleLogout } from "@/actions/user/logout-user";
import {
  beginSessionExit,
  cancelSessionExit,
  leaveSession,
} from "@/lib/clear-session-state";

import type { LogOutUserState } from "../protected-account-settings.types";

/** The action deleted the cookies: straight to the login page's "você saiu". */
const LOGGED_OUT_DESTINATION = "/login?reason=logout";

/**
 * The action's answer could not be read, so nothing says the cookies are
 * gone: a tab from an older build calling an action id the server no longer
 * knows gets `undefined`, and so does a call the middleware redirected. The
 * middleware's `force_logout` deletes them itself and lands on the same
 * `/login?reason=logout`, so the person still ends up logged out.
 */
const UNCONFIRMED_LOGOUT_DESTINATION = "/login?force_logout=true&error=logout";

const LOGOUT_UNREACHABLE =
  "Não foi possível sair agora. Verifique sua conexão e tente sair de novo.";

/**
 * The "Sair" form's action.
 *
 * Every way out but a refusal is a full load (see leaveSession): it drops the
 * tab's cache and stores with the document, instead of emptying them under
 * the protected tree that is still on screen.
 */
async function logOutUser(): Promise<LogOutUserState | null> {
  // Read once by the login page to say "você saiu".
  sessionStorage.setItem("pending_login_toast", "true");

  // Before the action: the API's "logout" socket event lands while it runs.
  beginSessionExit();

  let result: Awaited<ReturnType<typeof handleLogout>>;

  try {
    result = await handleLogout();
  } catch {
    // The call never reached an answer (offline, transport error): the tab is
    // still signed in, so the exit flag must not keep silencing forced
    // logouts and the session re-check for the rest of its life.
    result = { logoutError: LOGOUT_UNREACHABLE };
  }

  if (result?.logoutError) {
    sessionStorage.removeItem("pending_login_toast");
    cancelSessionExit();

    // Returned so the effect below can say it: the form used to answer null
    // on every path, and the failure toast never showed.
    return { logoutError: result.logoutError };
  }

  leaveSession(
    result?.loggedOut ? LOGGED_OUT_DESTINATION : UNCONFIRMED_LOGOUT_DESTINATION,
  );

  return null;
}

function useProtectedAccountSettings(
  state: LogOutUserState | null | undefined,
) {
  useEffect(() => {
    if (state?.logoutError) {
      toast.error(state?.logoutError);
      return;
    }
  }, [state]);
}

export { useProtectedAccountSettings, logOutUser };
