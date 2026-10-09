import { revalidatePath } from "next/cache";

import { isSessionRefusalCode } from "@/app/(protected)/_components/layout/shared/session-refusal";
import { readableValidationMessage } from "@/lib/api-error";

/**
 * `fetch` for the Server Actions' calls to the API.
 *
 * A Server Action only handed the API's message back to the screen, so a
 * session that ended mid-page (401 AUTH_SESSION_INVALID: revoked, or the user
 * deleted; 404 USER_NOT_FOUND; a session-level 403 such as TENANT_INACTIVE)
 * showed a toast and left the person on a dashboard where nothing worked.
 *
 * On such an answer to an authenticated call this re-renders the layout in
 * the same action response. That runs the protected area's own gate
 * (`/user/me` in ProtectedProvider), which is the one place that decides how
 * a session ends: a verdict signs the person out with the reason; an API that
 * is only busy (or a renewal still pending) keeps the session. Clearing the
 * cookies here instead would log out on a 401 the gate knows to forgive.
 *
 * The response is returned untouched (the code is read from a clone), so
 * the action still answers with its message.
 */

function isAuthenticated(init?: RequestInit): boolean {
  const headers = new Headers(init?.headers);

  return /^Bearer\s+\S+/i.test(headers.get("authorization") ?? "");
}

async function errorCodeOf(response: Response): Promise<string | null> {
  const header = response.headers.get("x-error-code");

  if (header) return header;

  try {
    const body: unknown = await response.clone().json();

    if (
      body &&
      typeof body === "object" &&
      typeof (body as { code?: unknown }).code === "string"
    ) {
      return (body as { code: string }).code;
    }
  } catch {
    // Not JSON (a proxy page): no code to read.
  }

  return null;
}

/** Whether an answer to an authenticated call says the session is over. */
async function endsSession(response: Response): Promise<boolean> {
  if (response.status === 401) return true;
  if (response.status !== 403 && response.status !== 404) return false;

  const code = await errorCodeOf(response);

  if (response.status === 404) return code === "USER_NOT_FOUND";

  return isSessionRefusalCode(code);
}

/**
 * The API's 400 VALIDATION_ERROR with its English "Validation Error" message,
 * rewritten so `message` is the sentence a person can act on (see
 * readableValidationMessage). Everything else in the body — `code`, `issues`
 * — and the status and headers are kept; any other answer is returned as is.
 */
async function withReadableValidation(response: Response): Promise<Response> {
  if (response.status !== 400) return response;

  let body: unknown;

  try {
    body = await response.clone().json();
  } catch {
    return response;
  }

  const message = readableValidationMessage(body);

  if (message === null) return response;

  const headers = new Headers(response.headers);

  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(JSON.stringify({ ...(body as object), message }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function apiFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await withReadableValidation(await fetch(input, init));

  try {
    if (isAuthenticated(init) && (await endsSession(response))) {
      revalidatePath("/", "layout");
    }
  } catch {
    // Reading the answer must never break the action that asked for it; and
    // outside a Server Action (a page reading through one) there is nothing
    // to re-render: that page's own gate already ran.
  }

  return response;
}

export { apiFetch, endsSession };
