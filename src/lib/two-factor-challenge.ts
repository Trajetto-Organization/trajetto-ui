import { cookies } from "next/headers";

/**
 * The two-factor challenge, kept between the password step and the code step.
 *
 * The API answers a password login that stops at two-factor with a
 * `twoFactorChallenge` — proof that this browser just got the password right
 * — and accepts the code, and a resend, only next to it. Without that tie,
 * anyone who knew an e-mail could have codes issued and guess them.
 *
 * It lives in an HttpOnly cookie that only the server actions read: a script
 * on the page cannot take it. Deliberately NOT a "use server" module, for the
 * same reason as `session-cookies`: everything exported from one is callable
 * from the browser.
 *
 * `sameSite: "strict"`: only this origin's own actions ever need it. Its life
 * matches the challenge's (30 minutes on the API).
 */
const CHALLENGE_COOKIE = "tfc";
const CHALLENGE_MAX_AGE_SECONDS = 30 * 60;

export function rememberTwoFactorChallenge(challenge: string | undefined) {
  const jar = cookies();

  // An API from before the challenge sends none: drop any left from an
  // earlier attempt rather than send a stale one.
  if (!challenge) {
    jar.delete(CHALLENGE_COOKIE);
    return;
  }

  jar.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

/**
 * `{ challenge }` to spread into a request body, or nothing — so a browser
 * without one sends exactly the body it always did.
 */
export function twoFactorChallengeField(): { challenge?: string } {
  const challenge = cookies().get(CHALLENGE_COOKIE)?.value;

  return challenge ? { challenge } : {};
}

export function forgetTwoFactorChallenge() {
  cookies().delete(CHALLENGE_COOKIE);
}
