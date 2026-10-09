import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Where the Filiais screen reads its company from (decision 8.7).
 *
 * `admin` is the MASTER's /admin: the company picked in the selector at the
 * top (`?businessId=`), and nothing to show until one is picked. The old
 * admin screen listed every company's branches mixed in one table, counted
 * its cards on that mix and asked for the company inside the create dialog.
 * `dashboard` is everyone else's: the session's company, never the URL's —
 * the API pins them to it anyway.
 *
 * No directive and no hooks: the server content and the client hook both
 * resolve through this.
 */
type BranchScope = "admin" | "dashboard";

type PageSearchParams = Record<string, string | string[] | undefined>;

function scopedBusinessId(
  scope: BranchScope,
  urlBusinessId: string | null | undefined,
  sessionBusinessId: string | null | undefined,
): string | undefined {
  if (scope === "admin") return readBusinessIdParam(urlBusinessId);

  return sessionBusinessId || undefined;
}

/** What the list sends: the MASTER names the company, the others never do. */
function businessIdQuery(
  scope: BranchScope,
  businessId: string | undefined,
): Record<string, string> {
  return scope === "admin" && businessId ? { businessId } : {};
}

/** The first value of a Next search param, which may repeat. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export {
  businessIdQuery,
  firstParam,
  scopedBusinessId,
  type BranchScope,
  type PageSearchParams,
};
