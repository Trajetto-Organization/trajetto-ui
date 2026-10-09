import { NextResponse } from "next/server";

import { DOCS_REFERENCE_PATH } from "../_lib/navigation";
import { fetchPublicSpec, publicApiUrl } from "../_lib/public-spec";

// The API's address is read at request time (its document's `servers`), so
// the image promoted from staging points at production's console.
export const dynamic = "force-dynamic";

/** The interactive console lives on the API (decision 11.2). */
export async function GET(request: Request): Promise<NextResponse> {
  const apiUrl = publicApiUrl(await fetchPublicSpec());

  const target = apiUrl
    ? `${apiUrl}/integration/docs`
    : new URL(DOCS_REFERENCE_PATH, request.url).toString();

  return NextResponse.redirect(target, 307);
}
