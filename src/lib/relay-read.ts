import { classifyAccessError, type AccessError } from "@/lib/access-error";
import { parseNDJSON } from "@/lib/parse-nd-json";

/**
 * A screen's read, made by the browser through the same-origin relay
 * (`app/api/relay`, lib/api-relay-paths).
 *
 * These reads used to be Server Actions called as react-query `queryFn`s.
 * Next 14's router runs Server Actions one at a time (its action queue), and
 * `router.refresh()` waits in the same line: the reads a screen fired "in
 * parallel" ran as a chain, a navigation dropped the queued ones with
 * promises that never settled (keys stuck "fetching"), and a failed read
 * kept the line busy through its retries. A relay read is a plain GET:
 * parallel, cancelled by react-query's AbortSignal, and its refusal carries
 * the real HTTP status, which the client's retry policy reads.
 *
 * Call sites pass `relayUrl("/literal/path", query)`, never a computed path:
 * the promote gate (scripts/check-api-routes.mjs) finds the API paths this
 * build calls by reading those literals.
 */

/** A refusal (or no answer) from a relay read. */
class RelayReadError extends Error {
  /** The HTTP status; null when nothing answered (the network failed). */
  readonly status: number | null;

  /** The API's error code (`PERMISSION_DENIED`…), when it sent one. */
  readonly code: string | null;

  /** The API's whole error body, for refusals that carry more (a 409). */
  readonly details: Record<string, unknown>;

  /** Which 403 it was (decision 4.1); null for anything else. */
  readonly accessError: AccessError | null;

  constructor(input: {
    message: string;
    status: number | null;
    code?: string | null;
    details?: Record<string, unknown>;
  }) {
    super(input.message);

    this.name = "RelayReadError";
    this.status = input.status;
    this.code = input.code ?? null;
    this.details = input.details ?? {};
    this.accessError =
      input.status === null
        ? null
        : classifyAccessError(input.status, this.details);
  }
}

interface RelayReadOptions {
  /** react-query's signal: an abandoned read is cancelled, not awaited. */
  signal?: AbortSignal;

  /** What the screen says when the refusal brought no sentence of its own. */
  errorMessage: string;
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof Error && error.name === "AbortError")
  );
}

async function relayResponse(
  url: string,
  { signal, errorMessage }: RelayReadOptions,
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    // An abandoned read stays an abort: react-query knows to drop it.
    if (isAbort(error, signal)) throw error;

    throw new RelayReadError({ message: errorMessage, status: null });
  }

  if (response.ok) return response;

  const body: unknown = await response.json().catch(() => null);
  const record = (
    body && typeof body === "object" && !Array.isArray(body) ? body : {}
  ) as Record<string, unknown>;

  throw new RelayReadError({
    message:
      typeof record.message === "string" && record.message.trim()
        ? record.message
        : errorMessage,
    status: response.status,
    code:
      typeof record.code === "string"
        ? record.code
        : response.headers.get("x-error-code"),
    details: record,
  });
}

/** A JSON read. Rejects with a `RelayReadError` on any refusal. */
async function relayJson<T>(
  url: string,
  options: RelayReadOptions,
): Promise<T> {
  const response = await relayResponse(url, options);

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (isAbort(error, options.signal)) throw error;

    // A 200 that is not JSON is a proxy page, not the API: an outage.
    throw new RelayReadError({
      message: options.errorMessage,
      status: 502,
    });
  }
}

/** An NDJSON list (`{ meta }` line plus one row per line). */
async function relayNdjson<T>(
  url: string,
  options: RelayReadOptions,
): Promise<{ meta: any; data: T[] }> {
  const response = await relayResponse(url, options);

  return (await parseNDJSON(response)) as { meta: any; data: T[] };
}

/**
 * A read's outcome as a value, in the shape the Server Actions answered
 * (`success`, `message`, `data`, `accessError`, plus the API's `failure`).
 *
 * For the callers written around that shape — a chat window load, a deep
 * link — which read the answer in straight-line code and must never meet a
 * rejection. An abort still rejects: whoever aborted is not reading.
 */
interface RelayAnswer<T> {
  success: boolean;
  message: string;
  data?: T;
  status?: number | null;
  accessError?: AccessError | null;
  failure?: { code: string | null; details: Record<string, unknown> };
}

async function relayAnswer<T>(
  read: Promise<T>,
  fallbackMessage: string,
): Promise<RelayAnswer<T>> {
  try {
    return { success: true, message: "", data: await read };
  } catch (error) {
    if (isAbort(error)) throw error;

    if (error instanceof RelayReadError) {
      return {
        success: false,
        message: error.message,
        status: error.status,
        accessError: error.accessError,
        failure: { code: error.code, details: error.details },
      };
    }

    return { success: false, message: fallbackMessage };
  }
}

/**
 * Whether a failed read is worth one more attempt: nothing answered, or the
 * server side failed (5xx). A 4xx answers the same every time, and an error
 * that is not a relay read's (a thrown `Error` of a screen's own) says
 * nothing about the network.
 */
function isRetryableReadError(error: unknown): boolean {
  if (!(error instanceof RelayReadError)) return false;

  return error.status === null || error.status >= 500;
}

/** Builds a query string from the defined values only. */
function readQuery(
  values: Record<string, string | number | boolean | null | undefined>,
): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;

    query.set(key, String(value));
  }

  return query;
}

export {
  RelayReadError,
  relayJson,
  relayNdjson,
  relayAnswer,
  isRetryableReadError,
  readQuery,
};
export type { RelayReadOptions, RelayAnswer };
