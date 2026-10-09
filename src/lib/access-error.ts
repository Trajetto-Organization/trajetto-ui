/**
 * What a 403 from the API means, read from its `code` (decision 4.1).
 *
 * Every 403 used to become "Módulo Entregas não contratado": a read-only
 * user of a company that HAD hired Entregas opened Ocorrências and was told
 * the company had not. The API now names each refusal, and this is the one
 * place the web reads the name.
 *
 * Only MODULE_NOT_ENABLED is ever the module state. Anything else that is a
 * 403 — PERMISSION_DENIED, a tenant refusal, a role gate, a code this build
 * does not know yet — is a permission problem of THIS user, never a claim
 * about the company's plan.
 */
type AccessErrorKind =
  "module-not-enabled" | "permission-denied" | "tenant-inactive";

interface AccessError {
  kind: AccessErrorKind;
  /** The API's own sentence, when it sent one. */
  message: string | null;
}

function classifyAccessError(
  status: number,
  body: unknown,
): AccessError | null {
  if (status !== 403) return null;

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const code = typeof record.code === "string" ? record.code : null;
  const message =
    typeof record.message === "string" && record.message.trim()
      ? record.message
      : null;

  if (code === "MODULE_NOT_ENABLED") {
    return { kind: "module-not-enabled", message };
  }

  // AUTH_BUSINESS_INACTIVE is the same fact said by the session gate (the
  // user's own company was switched off), not a missing permission.
  if (code === "TENANT_INACTIVE" || code === "AUTH_BUSINESS_INACTIVE") {
    return { kind: "tenant-inactive", message };
  }

  return { kind: "permission-denied", message };
}

/**
 * The classification of a fetch Response. Reads a clone, so the caller can
 * still read the body; an unreadable body is classified by status alone.
 */
async function readAccessError(
  response: Response,
): Promise<AccessError | null> {
  if (response.status !== 403) return null;

  const body = await response
    .clone()
    .json()
    .catch(() => null);

  return classifyAccessError(response.status, body);
}

export { classifyAccessError, readAccessError };
export type { AccessError, AccessErrorKind };
