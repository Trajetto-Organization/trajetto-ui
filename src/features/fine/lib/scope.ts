import { readBusinessIdParam } from "@/lib/business-id-param";

import type { FineScreenMode } from "./types";

/**
 * Which company a fines screen works on: on /admin the company the MASTER
 * picked in the selector (the URL), on /dashboard the session's own.
 *
 * By mode and not "URL first": on /dashboard a `?businessId=` in a pasted
 * link must not make the screen act on a company the session is not in.
 * Only a company id is taken from the URL: it becomes a segment of API
 * paths called with the viewer's token.
 */
function resolveFineBusinessId(
  mode: FineScreenMode,
  urlBusinessId: string | null | undefined,
  sessionBusinessId: string | null | undefined,
): string | undefined {
  if (mode === "admin") return readBusinessIdParam(urlBusinessId);

  return sessionBusinessId || undefined;
}

export { resolveFineBusinessId };
