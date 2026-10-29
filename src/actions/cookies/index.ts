// Helper of the Server Actions and Server Components, not an action itself:
// never bundled for the browser (a client import is a build error).
import "server-only";

import { cookies } from "next/headers";

// Writing and clearing the session cookies lives in `@/lib/session-cookies`.

/**
 * The cookies server code may read through this helper.
 *
 * This module used to be a Server Action, which made it an endpoint any
 * script on the origin could call: it handed the access token (`tkey`) to
 * page JavaScript for the browser's Socket.IO handshake and for ~a dozen
 * hooks that called the API straight from the browser. The socket now gets a
 * one-use ticket (`actions/session` → POST /user/socket-ticket) and those
 * reads go through the same-origin relay (`app/api/relay`), so no token
 * leaves the server. The refresh token is not readable even here.
 */
const READABLE_COOKIES = new Set(["tkey"]);

async function getCookies(cookieName: string) {
  if (!READABLE_COOKIES.has(cookieName)) return undefined;

  return cookies().get(cookieName)?.value;
}

export { getCookies };
