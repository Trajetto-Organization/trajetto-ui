/**
 * What a refusal from the API says, when the screen has to say it.
 *
 * The API's own sentence (pt-BR, per code) is always the first choice: every
 * error body it writes carries `code` and `message` (decision 11.3). The
 * fallbacks below exist for answers that are not the API speaking — a proxy
 * page, an empty body — so a refusal never reads as a success or as silence.
 */

const STATUS_FALLBACK: Readonly<Record<number, string>> = {
  400: "O servidor recusou os dados enviados. Revise o formulário e tente novamente.",
  401: "Sua sessão expirou. Entre novamente para continuar.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "O registro não foi encontrado. Atualize a página e tente novamente.",
  409: "O registro mudou enquanto você trabalhava nele. Atualize a página e tente novamente.",
  410: "Este recurso não está mais disponível.",
  413: "O conteúdo enviado é grande demais.",
  429: "Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.",
};

const SERVER_FALLBACK =
  "O servidor não conseguiu concluir a operação. Tente novamente em instantes.";

const GENERIC_FALLBACK =
  "Não foi possível concluir a operação. Tente novamente.";

/**
 * The sentence for a refusal whose body brought none of its own.
 *
 * Used as `message || refusalMessage(response.status)`: without it, the
 * actions read `if (!response.ok && message)` and a refusal with no message
 * fell through to `{ successMessage: undefined }` — a delete the API refused
 * looked done, and a two-factor step went on with no token.
 */
function refusalMessage(status: number): string {
  if (status >= 500) return SERVER_FALLBACK;

  return STATUS_FALLBACK[status] ?? GENERIC_FALLBACK;
}

/** The `code` of an error answer: the body's, else the `x-error-code` header. */
function errorCodeOf(
  body: unknown,
  headers?: Headers | null,
): string | undefined {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (typeof record.code === "string" && record.code) return record.code;

  return headers?.get("x-error-code") ?? undefined;
}

/**
 * Deletion confirmations the code can no longer satisfy: nothing was requested
 * (409 *_DELETION_NOT_REQUESTED — another tab confirmed it, or the request was
 * replaced) or the code expired. Typing it again cannot work; only asking for
 * a new code can, so the dialog offers that instead of a generic conflict.
 */
const NEW_DELETION_CODE_REQUIRED = new Set([
  "BRANCH_DELETION_NOT_REQUESTED",
  "BRANCH_DELETION_CODE_EXPIRED",
  "BUSINESS_DELETION_NOT_REQUESTED",
  "BUSINESS_DELETION_CODE_EXPIRED",
]);

const NEW_DELETION_CODE_MESSAGE =
  "Não há um código de exclusão válido. Peça um novo código e tente novamente.";

function needsNewDeletionCode(code: string | undefined): boolean {
  return code !== undefined && NEW_DELETION_CODE_REQUIRED.has(code);
}

/**
 * The resend cooldown after a refused deletion code. When the refusal says a
 * new code is needed, "Reenviar código" is freed at once: waiting out the
 * 60 s left from the last request would only keep the person retyping a code
 * that can no longer work.
 */
function resendCooldownAfterRefusal(
  refusal: { requestNewCode?: boolean },
  currentSeconds: number,
): number {
  return refusal.requestNewCode ? 0 : currentSeconds;
}

/**
 * What a person reads for the API's schema refusal (400 VALIDATION_ERROR).
 *
 * The API's `message` there is the generic English "Validation Error" and
 * the field's own sentence is in `issues`. Ninety actions show
 * `message || refusalMessage(status)`, so the sheet of "Adicionar entregas",
 * a service order and every other form printed "Validation Error". The
 * first issue is used when it is a sentence written for people; zod's own
 * English defaults ("Required", "Expected string…") fall back to the pt-BR
 * 400 text. Any other body is returned untouched (null).
 */
const GENERIC_VALIDATION_MESSAGE = /^validation error$/i;
const ZOD_DEFAULT_ISSUE =
  /^(Required|Expected\b|Invalid\b|String must\b|Number must\b|Array must\b|Unrecognized key)/;

function readableValidationMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const record = body as {
    code?: unknown;
    message?: unknown;
    issues?: unknown;
  };

  const generic =
    typeof record.message !== "string" ||
    GENERIC_VALIDATION_MESSAGE.test(record.message.trim());

  if (record.code !== "VALIDATION_ERROR" || !generic) return null;

  const issue = Array.isArray(record.issues)
    ? record.issues.find(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim() !== "",
      )
    : undefined;

  return issue && !ZOD_DEFAULT_ISSUE.test(issue.trim())
    ? issue.trim()
    : refusalMessage(400);
}

export {
  NEW_DELETION_CODE_MESSAGE,
  errorCodeOf,
  needsNewDeletionCode,
  readableValidationMessage,
  refusalMessage,
  resendCooldownAfterRefusal,
};
