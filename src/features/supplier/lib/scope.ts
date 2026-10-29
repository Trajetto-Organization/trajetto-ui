import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Where the finance screens (Fornecedores, Contas a pagar) read their company
 * from (decision 8.7).
 *
 * `admin` is the MASTER's /admin: the company picked in the selector at the
 * top (`?businessId=`), and nothing to show until one is picked. The old
 * admin screens listed every company mixed in one table and asked for the
 * company inside each create dialog. `dashboard` is everyone else's: the
 * session's company, never the URL's — the API pins them to it anyway.
 *
 * No directive and no hooks: the server content and the client hook both
 * resolve through this.
 */
type FinanceScope = "admin" | "dashboard";

function scopedBusinessId(
  scope: FinanceScope,
  urlBusinessId: string | null | undefined,
  sessionBusinessId: string | null | undefined,
): string | undefined {
  if (scope === "admin") return readBusinessIdParam(urlBusinessId);

  return sessionBusinessId || undefined;
}

/**
 * Whether /admin has a company picked (a valid id in `?businessId=`): the
 * page, and so its loading shape, is only the selector and the "Selecione
 * uma empresa" box until then.
 */
function hasSelectedBusiness(
  urlBusinessId: string | null | undefined,
): boolean {
  return readBusinessIdParam(urlBusinessId) !== undefined;
}

/** What the list and the export send: the MASTER names the company. */
function businessIdQuery(
  scope: FinanceScope,
  businessId: string | undefined,
): Record<string, string> {
  return scope === "admin" && businessId ? { businessId } : {};
}

/** The first value of a Next search param, which may repeat. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

export {
  businessIdQuery,
  firstParam,
  hasSelectedBusiness,
  scopedBusinessId,
  type FinanceScope,
  type PageSearchParams,
};
