/**
 * What a server action's try/catch caught, written where the operation can
 * read it (OBS-12).
 *
 * The actions answer the user with a fixed "Ocorreu um erro inesperado..." and
 * used to drop the error itself, so an API that stopped answering, a proxy
 * returning HTML instead of JSON or a bug in the action left the web's log
 * empty. One JSON line on stderr per failure, with the action's name — the
 * same shape everywhere, so a log search or an alert can key on
 * `source: "server-action"`.
 *
 * Only the error's name, message and cause, scrubbed: a fetch that failed to
 * parse its URL quotes the URL, query string (a reset token) included.
 * Request bodies and headers are never read here.
 */

const MAX_TEXT = 500;

const SECRETS: Array<[RegExp, string]> = [
  // Query strings: reset and verification tokens travel there.
  [/(https?:\/\/[^\s?#"']*|\/[^\s?#"']*)\?[^\s#"']*/gi, "$1?[redacted]"],
  [/\bBearer\s+[\w.~+/=-]+/gi, "Bearer [redacted]"],
  [/\beyJ[\w-]*\.[\w-]+\.[\w-]+/g, "[redacted-jwt]"],
  // Public links (tracking, opt-out, proof verification) carry their only
  // authorisation as a PATH segment: 64 hex chars (lib/public-token.ts).
  [/\b[0-9a-f]{64}\b/gi, "[redacted-token]"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[redacted-email]"],
];

function scrub(text: string): string {
  let result = text;

  for (const [pattern, replacement] of SECRETS) {
    result = result.replace(pattern, replacement);
  }

  return result.slice(0, MAX_TEXT);
}

/**
 * redirect(), notFound() and the dynamic-rendering bailout throw on purpose;
 * they are Next's control flow, not failures.
 */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;

  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_") ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest.startsWith("BAILOUT_TO_CLIENT_SIDE_RENDERING"))
  );
}

function describeCause(cause: unknown): string | undefined {
  if (cause instanceof Error) {
    const code = (cause as { code?: unknown }).code;
    const prefix = typeof code === "string" ? `${code}: ` : `${cause.name}: `;

    return scrub(`${prefix}${cause.message}`);
  }

  return typeof cause === "string" ? scrub(cause) : undefined;
}

function logActionError(action: string, error: unknown): void {
  try {
    if (isNextControlFlow(error)) return;

    const isError = error instanceof Error;

    console.error(
      JSON.stringify({
        level: "error",
        source: "server-action",
        action,
        name: isError ? error.name : typeof error,
        message: scrub(isError ? error.message : String(error)),
        cause: isError
          ? describeCause((error as { cause?: unknown }).cause)
          : undefined,
        time: new Date().toISOString(),
      }),
    );
  } catch {
    // Logging a failure must never become one.
  }
}

export { logActionError };
