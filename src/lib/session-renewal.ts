/**
 * What the middleware does with the API's answer to a token refresh.
 *
 * Any answer other than 200 used to log the person out and delete their
 * cookies — a 429, a 503 during a deploy and a dropped connection included.
 * A hiccup of the API became a mass logout. Only the API saying the session
 * is over should end it; the API not answering says nothing about the
 * session at all.
 */

/**
 * Set on the request by the middleware when the access token expired and the
 * refresh could not be completed for a reason that is not the session's. The
 * protected layout reads it and shows the reconnection screen instead of
 * treating the expired token's 401 as a verdict.
 */
const SESSION_RENEWAL_HEADER = "x-session-renewal";
const RENEWAL_PENDING = "pending";

/** Whether this refresh answer is the API saying the session is over. */
function refreshAnswerEndsSession(status: number): boolean {
  // Busy (429), timed out (408) or failing (5xx): nothing learned.
  if (status === 429 || status === 408) return false;

  return status >= 400 && status < 500;
}

export { RENEWAL_PENDING, SESSION_RENEWAL_HEADER, refreshAnswerEndsSession };
