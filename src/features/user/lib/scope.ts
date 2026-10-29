import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Where an admin-users screen (users, access profiles, permissions) reads
 * its company from (decision 8.7). No directive and no hooks: the server
 * content, the client components and the tests import it.
 *
 * `admin` is the MASTER's /admin: the company picked in the selector at the
 * top (`?businessId=`), and nothing to show until one is picked.
 * `dashboard` is everyone else's: the session's company, never the URL's —
 * the API pins them to it anyway.
 */
type AdminScope = "admin" | "dashboard";

function scopedBusinessId(
  scope: AdminScope,
  urlBusinessId: string | null | undefined,
  sessionBusinessId: string | null | undefined,
): string | undefined {
  if (scope === "admin") return readBusinessIdParam(urlBusinessId);

  return sessionBusinessId || undefined;
}

/** "7 (70%)" — or "—" when the number is unknown. */
function countWithShare(
  count: number | undefined,
  total: number | undefined,
): string {
  if (count === undefined || total === undefined) return "—";

  return total > 0 ? `${count} (${Math.round((count / total) * 100)}%)` : "0";
}

export { countWithShare, scopedBusinessId, type AdminScope };
