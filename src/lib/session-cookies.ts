import { cookies } from "next/headers";

import { sessionCookieOptions } from "./session-cookie-options";

/**
 * Writing and clearing the session cookies — from the server only.
 *
 * Deliberately NOT a "use server" module. These used to live next to
 * `getCookies` in `actions/cookies`, and everything exported from there is a
 * Server Action the browser can call: any script on the origin could write an
 * HttpOnly `tkey`/`rkey` of its choosing and plant a session. Only the login,
 * two-factor and logout actions call these, on the server.
 */
interface SessionTokens {
  token: string;
  refresh_token: string;
}

export function setSessionCookies({ token, refresh_token }: SessionTokens) {
  const jar = cookies();
  const options = sessionCookieOptions(refresh_token);

  jar.set("tkey", token, options);
  jar.set("rkey", refresh_token, options);
}

export function clearSessionCookies() {
  const jar = cookies();

  jar.delete("tkey");
  jar.delete("rkey");
}
