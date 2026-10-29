import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Where a fleet screen reads its company from (decision 8.7).
 *
 * `admin` is the MASTER's /admin: the company is the one picked in the
 * selector at the top (`?businessId=`), and there is nothing to show until
 * one is picked. `dashboard` is everyone else's /dashboard: the session's
 * company, never the URL's — the API pins them to it anyway.
 *
 * No directive and no hooks: the server content and the client hook both
 * resolve through this.
 */
type FleetScope = "admin" | "dashboard";

function scopedBusinessId(
  scope: FleetScope,
  urlBusinessId: string | null | undefined,
  sessionBusinessId: string | null | undefined,
): string | undefined {
  if (scope === "admin") return readBusinessIdParam(urlBusinessId);

  return sessionBusinessId || undefined;
}

/** The query the list sends: the MASTER names the company, others do not. */
function businessIdQuery(
  scope: FleetScope,
  businessId: string | undefined,
): Record<string, string> {
  return scope === "admin" && businessId ? { businessId } : {};
}

export { businessIdQuery, scopedBusinessId, type FleetScope };
