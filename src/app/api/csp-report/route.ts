export const dynamic = "force-dynamic";

/**
 * Where browsers report what the enforced Content-Security-Policy blocked.
 *
 * A line here is either an attack stopped or a page the policy broke, so each
 * one is worth reading. One compact `console.error` per violation — the only
 * level the production build keeps.
 *
 * Anonymous by nature, so it is cheap and bounded: a small body cap, only the
 * three fields worth reading, and at most a minute's worth of lines per
 * instance.
 *
 * And nothing in a line works as a credential. Query strings go (a presigned
 * URL's signature lives there), and so do opaque path segments: the public
 * tracking and proof pages carry their bearer token in the PATH
 * (/acompanhar/<token>), and a violation there would log it.
 */
const MAX_BODY_BYTES = 16 * 1024;
const MAX_LOGS_PER_MINUTE = 60;

let windowStartedAt = 0;
let loggedInWindow = 0;

function underLogBudget(now = Date.now()): boolean {
  if (now - windowStartedAt >= 60_000) {
    windowStartedAt = now;
    loggedInWindow = 0;
  }

  loggedInWindow += 1;

  return loggedInWindow <= MAX_LOGS_PER_MINUTE;
}

interface Violation {
  directive: string;
  blocked: string;
  path: string;
  /**
   * "enforce" (something was blocked) or "report" (the Report-Only Trusted
   * Types policy: nothing was blocked, it only says what enforcing would
   * break). Read from the report; enforced when the browser leaves it out.
   */
  disposition: "enforce" | "report";
}

function dispositionOf(value: unknown): Violation["disposition"] {
  return value === "report" ? "report" : "enforce";
}

/**
 * A long run of letters, digits, `-` and `_` with a digit in it: a token, a
 * key or an id. The page is still recognisable without it.
 */
function redactPath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) =>
      /^[\w-]{16,}$/.test(segment) && /\d/.test(segment) ? ":token" : segment,
    )
    .join("/");
}

function pathOf(url: unknown): string {
  if (typeof url !== "string") return "";

  try {
    return redactPath(new URL(url).pathname);
  } catch {
    return "";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 300) : "";
}

/**
 * Where the blocked resource was, without what would let anyone fetch it.
 * Browsers also report keywords here ("inline", "eval"), kept as they are.
 */
function blockedOf(value: unknown): string {
  if (typeof value !== "string") return "";

  try {
    const url = new URL(value);

    if (/^(https?|wss?):$/.test(url.protocol)) {
      return text(`${url.origin}${redactPath(url.pathname)}`);
    }

    return text(url.protocol);
  } catch {
    return text(value);
  }
}

/**
 * The body as text, or `null` past `limit` bytes. Read chunk by chunk and
 * abandoned at the limit, so a body sent without Content-Length is never
 * buffered whole.
 */
async function readBounded(
  request: Request,
  limit: number,
): Promise<string | null> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    size += value.byteLength;

    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }

    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

/** Both formats: `application/csp-report` (report-uri) and the Reporting API. */
function violationsOf(payload: unknown): Violation[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((entry) => entry?.type === "csp-violation" && entry.body)
      .map(({ body }) => ({
        directive: text(body.effectiveDirective ?? body.violatedDirective),
        blocked: blockedOf(body.blockedURL),
        path: pathOf(body.documentURL),
        disposition: dispositionOf(body.disposition),
      }));
  }

  const report = (payload as { "csp-report"?: Record<string, unknown> })?.[
    "csp-report"
  ];

  if (!report || typeof report !== "object") return [];

  return [
    {
      directive: text(
        report["effective-directive"] ?? report["violated-directive"],
      ),
      blocked: blockedOf(report["blocked-uri"]),
      path: pathOf(report["document-uri"]),
      disposition: dispositionOf(report.disposition),
    },
  ];
}

export async function POST(request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);

  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let raw: string | null;

  try {
    raw = await readBounded(request, MAX_BODY_BYTES);
  } catch {
    return new Response(null, { status: 204 });
  }

  if (raw === null) return new Response(null, { status: 413 });

  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 204 });
  }

  for (const violation of violationsOf(payload).slice(0, 10)) {
    if (!underLogBudget()) break;

    console.error("[csp-report]", violation);
  }

  return new Response(null, { status: 204 });
}
