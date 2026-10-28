import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { isRelayPath, relayUploadLimit } from "@/lib/api-relay-paths";

export const dynamic = "force-dynamic";

/**
 * Same-origin relay for the API reads the browser makes (and the two imports,
 * POST, below).
 *
 * The page used to call the API directly with the access token, which a
 * Server Action handed to page JavaScript. Here the token is read from the
 * HttpOnly cookie and attached on the server; the browser only ever talks to
 * its own origin. Closed list of paths (lib/api-relay-paths.ts), GET only,
 * no caching. The middleware runs first for /api too, so an expired token is
 * renewed exactly as on a navigation.
 */

/**
 * What the callers read from an answer; nothing else is copied back. The
 * exports read the file's name (content-disposition) and row count.
 */
const FORWARDED_HEADERS = [
  "content-type",
  "x-error-code",
  "retry-after",
  "x-request-id",
  "content-disposition",
  "x-total-records",
];

/**
 * The answer's headers for the browser. The length only when fetch handed the
 * body over as the API sent it: an encoded body is decoded on the way, and
 * its length no longer matches.
 */
function answerHeaders(upstream: Response): Headers {
  const headers = new Headers({ "Cache-Control": "no-store" });

  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);

    if (value) headers.set(name, value);
  }

  const length = upstream.headers.get("content-length");

  if (length && !upstream.headers.get("content-encoding")) {
    headers.set("content-length", length);
  }

  return headers;
}

function refusal(status: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    { code, message },
    { status, headers: { "Cache-Control": "no-store", "x-error-code": code } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } },
): Promise<Response> {
  const segments = params.path ?? [];
  const path = `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;

  if (!isRelayPath(path)) {
    return refusal(404, "NOT_FOUND", "Recurso não encontrado.");
  }

  const tokenAccess = cookies().get("tkey")?.value;

  if (!tokenAccess) {
    return refusal(
      401,
      "AUTH_TOKEN_MISSING",
      "Sessão expirada. Faça login novamente.",
    );
  }

  let upstream: Response;

  try {
    upstream = await fetch(
      `${process.env.HTTP_REQUEST}${path}${request.nextUrl.search}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          Accept: "application/json",
          // A token the middleware could not renew falls to the API's
          // per-address limit: say which browser this is, not this server.
          ...apiForwardingHeaders(request.headers),
        },
        cache: "no-store",
        signal: request.signal,
      },
    );
  } catch (error) {
    if (request.signal.aborted) throw error;

    // No answer from the API is an outage, never a verdict on the session.
    return refusal(
      503,
      "API_UNREACHABLE",
      "Não foi possível falar com o servidor. Tente novamente.",
    );
  }

  // The body streams through (NDJSON lists and export files included), a
  // chunk at a time; fetch already undid any compression, so no
  // content-encoding is copied.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: answerHeaders(upstream),
  });
}

/** Whether the browser says this POST comes from a page of this origin. */
function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");

  if (site) return site === "same-origin";

  // No Fetch Metadata (an old browser): the Origin's host against ours.
  // Host only, not the scheme: behind the proxy this server sees http.
  const origin = request.headers.get("origin");

  try {
    return (
      origin !== null && new URL(origin).host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}

/**
 * The imports, the only writes carried here (lib/api-relay-paths.ts,
 * RELAY_UPLOAD_PATHS): their bodies are past the 1 MB a Server Action takes.
 *
 * The body streams to the API untouched — the API's request contract (JSON
 * with the file in base64) is the browser's — under the API's own ceiling.
 * It writes with the session's cookie, so it takes only what a page of this
 * origin can send: a same-origin POST of JSON. A form on another site can do
 * neither (SameSite=Lax keeps the cookie off its POST, too).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } },
): Promise<Response> {
  const segments = params.path ?? [];
  const path = `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  const limit = relayUploadLimit(path);

  if (limit === null) {
    return refusal(404, "NOT_FOUND", "Recurso não encontrado.");
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!isSameOrigin(request) || !/^application\/json\b/i.test(contentType)) {
    return refusal(403, "FORBIDDEN_ORIGIN", "Requisição não permitida.");
  }

  // The declared length bounds the body (the HTTP server stops reading
  // there), so checking it caps the upload without counting the stream.
  const declared = Number(request.headers.get("content-length") ?? NaN);

  if (!Number.isFinite(declared)) {
    return refusal(
      411,
      "LENGTH_REQUIRED",
      "Não foi possível ler o tamanho do arquivo enviado.",
    );
  }

  if (declared > limit) {
    return refusal(
      413,
      "PAYLOAD_TOO_LARGE",
      "O arquivo excede o tamanho permitido para importação.",
    );
  }

  const tokenAccess = cookies().get("tkey")?.value;

  if (!tokenAccess) {
    return refusal(
      401,
      "AUTH_TOKEN_MISSING",
      "Sessão expirada. Faça login novamente.",
    );
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${process.env.HTTP_REQUEST}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...apiForwardingHeaders(request.headers),
      },
      body: request.body,
      // Node's fetch streams a request body only half-duplex.
      duplex: "half",
      cache: "no-store",
      signal: request.signal,
    } as RequestInit);
  } catch (error) {
    if (request.signal.aborted) throw error;

    // The write may or may not have reached the API: never a verdict on the
    // session, and the screen says to check before sending again.
    return refusal(
      503,
      "API_UNREACHABLE",
      "Não foi possível falar com o servidor. Confira a lista de importações antes de enviar de novo.",
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: answerHeaders(upstream),
  });
}
