"use server";

import { cookies } from "next/headers";

import { apiFetch } from "@/lib/api-fetch";
import { logActionError } from "@/lib/log-action-error";
import { handleLogOutUser } from "../user-authentication";

const REVOKE_TIMEOUT_MS = 3_000;

/**
 * Ends the session on the API too: POST /user/logout revokes this session's
 * refresh-token family. Deleting the cookies alone left that refresh token
 * valid for its whole lifetime, so a copy taken before "Sair" (another
 * device, a stolen cookie) kept minting access tokens after the logout.
 *
 * Best effort: an API that is down or an access token already expired must
 * not keep the person signed in on this browser, so the cookies go anyway.
 */
async function revokeApiSession(): Promise<void> {
  try {
    const token = cookies().get("tkey")?.value;

    if (!token) return;

    await apiFetch(`${process.env.HTTP_REQUEST}/user/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REVOKE_TIMEOUT_MS),
    });
  } catch (error) {
    logActionError("user/logout-user/revoke", error);
  }
}

interface LogoutResult {
  loggedOut?: true;
  logoutError?: string;
}

/**
 * Deletes the session cookies and says so; the client leaves with a full load.
 *
 * It used to end in `redirect("/login")`: a soft navigation that kept the
 * tab's memory (QueryClient, stores, socket) alive, and reached the caller as
 * `undefined` — the same answer a tab from an older build gets for an action
 * id the server no longer knows, when nothing was logged out at all. A real
 * answer on success keeps the two apart (see logOutUser).
 */
const handleLogout = async (): Promise<LogoutResult> => {
  try {
    await revokeApiSession();
    await handleLogOutUser();

    return { loggedOut: true };
  } catch (error) {
    logActionError("user/logout-user", error);

    return {
      logoutError:
        "Ocorreu um erro inesperado ao tentar fazer o log out! Por favor, tente novamente.",
    };
  }
};

export { handleLogout };
export type { LogoutResult };
