import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { isRelayPath } from "@/lib/api-relay-paths";

export const dynamic = "force-dynamic";

/**
 * Same-origin, read-only relay for the API reads the browser makes.
 *
 * The page used to call the API directly with the access token, which a
 * Server Action handed to page JavaScript. Here the token is read from the
 * HttpOnly cookie and attached on the server; the browser only ever talks to
 * its own origin. Closed list of paths (lib/api-relay-paths.ts), GET only,
 * no caching. The middleware runs first for /api too, so an expired token is
 * renewed exactly as on a navigation.
 */

/** What the callers read from an answer; nothing else is copied back. */
const FORWARDED_HEADERS = [
  "content-type",
  "x-error-code",
  "retry-after",
  "x-request-id",
];

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

  const headers = new Headers({ "Cache-Control": "no-store" });

  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);

    if (value) headers.set(name, value);
  }

  // The body streams through (NDJSON lists included); fetch already undid
  // any compression, so no content-encoding/length is copied.
  return new Response(upstream.body, { status: upstream.status, headers });
}
