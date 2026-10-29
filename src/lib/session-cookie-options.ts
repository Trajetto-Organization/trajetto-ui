import { parseJwt } from "./decode-jwt";

/**
 * The attributes of the two session cookies, `tkey` and `rkey`.
 *
 * Both last as long as the REFRESH token, not the access token: the
 * middleware refreshes when it finds an EXPIRED access token, so the browser
 * has to keep sending it past its fifteen minutes. A lifetime tied to the
 * access token would drop it and send the person to /login instead.
 *
 * No `maxAge` when the refresh token's `exp` cannot be read or is already in
 * the past — the cookie is then a session cookie, as it always effectively
 * was. Never `NaN`: `Max-Age=NaN` is what login used to emit, and browsers
 * discard it silently.
 *
 * Edge-safe on purpose: the middleware uses it too.
 */
export interface SessionCookieOptions {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge?: number;
}

export function sessionCookieOptions(
  refreshToken: string,
  nowMs: number = Date.now(),
): SessionCookieOptions {
  const options: SessionCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  };

  const exp = parseJwt(refreshToken)?.exp;

  if (typeof exp !== "number" || !Number.isFinite(exp)) return options;

  const maxAge = Math.floor(exp - nowMs / 1000);

  return maxAge > 0 ? { ...options, maxAge } : options;
}
