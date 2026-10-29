import type { ForceLogoutReason } from "@/lib/force-logout";

/**
 * A deactivated company is its own reason (decision 4.1), not a revoked
 * access: the person's own account is untouched. The API's socket kick uses
 * the same word (socket-logout-reason.ts), so the live event and this
 * `/user/me` re-read say the same thing.
 */
const COMPANY_INACTIVE_REASON: ForceLogoutReason = "business_inactive";

/**
 * The API's session-level refusals (session-eligibility.ts), by code. Read
 * from `code`, never from the message: the copy is free to change, the code
 * is the contract (decision 4.1). A Map, so a code like "constructor" cannot
 * resolve to something inherited.
 */
const REFUSAL_CODE_TO_REASON: ReadonlyMap<string, ForceLogoutReason> = new Map<
  string,
  ForceLogoutReason
>([
  ["AUTH_ACCESS_REVOKED", "user_revoked"],
  ["AUTH_DRIVER_INACTIVE", "driver_inactive"],
  // The driver's branch, not the account: "conta excluída" was wrong.
  ["AUTH_BRANCH_INACTIVE", "branch_inactive"],
  ["AUTH_BUSINESS_INACTIVE", COMPANY_INACTIVE_REASON],
  ["TENANT_INACTIVE", COMPANY_INACTIVE_REASON],
  ["AUTH_PROFILE_NOT_CONFIGURED", "no_user_permission"],
]);

function readErrorCode(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const code = (body as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}

function reasonForForbidden(body: unknown): ForceLogoutReason {
  const code = readErrorCode(body);

  return (code !== null && REFUSAL_CODE_TO_REASON.get(code)) || "access_denied";
}

/**
 * What a refused `/user/me` means for the session, or `null` when the API did
 * not judge it (5xx, 429, a timeout) and the connection screen keeps asking.
 *
 * Every 403 is a verdict. An unmapped code still ends the session, as
 * `access_denied`: handing it to the connection screen made the page refresh
 * in a loop until the access token expired, and the user never learned why.
 */
function sessionRefusalReason(
  status: number,
  body: unknown,
): ForceLogoutReason | null {
  if (status === 401) return "session_expired";
  if (status === 404) return "access_denied";
  if (status === 403) return reasonForForbidden(body);

  return null;
}

/**
 * Why a refresh the API refused ended the session. The refresh runs the same
 * eligibility check as `/user/me`, so its 403 carries the same codes; the
 * other refusals (an expired, invalidated or reused refresh token) are the
 * session simply being over.
 */
function refreshRefusalReason(
  status: number,
  body: unknown,
): ForceLogoutReason {
  return status === 403 ? reasonForForbidden(body) : "session_expired";
}

/** Whether a 403 code is a verdict on the session, not on one permission. */
function isSessionRefusalCode(code: string | null | undefined): boolean {
  return typeof code === "string" && REFUSAL_CODE_TO_REASON.has(code);
}

export {
  COMPANY_INACTIVE_REASON,
  isSessionRefusalCode,
  refreshRefusalReason,
  sessionRefusalReason,
};
