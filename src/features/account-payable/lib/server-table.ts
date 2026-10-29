import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { ACCOUNT_PAYABLE_CATEGORIES } from "@/schemas/create-update-account-payable-schema";

import type { PageSearchParams } from "@/features/supplier/lib/scope";

import type { AccountPayableStatus, AccountPayableStatusGroup } from "./status";

/**
 * The accounts payable list's server-side table (decision 8.8). Sort keys and
 * facets are the API's (trajetto-api list-account-payable-schema); the
 * column ids match them. The status is computed by the API from the
 * company's business day, so it filters but does not sort — sorting by the
 * due date reads the same. No directive: the server content imports it.
 */
const ACCOUNT_PAYABLE_STATUS_GROUPS = ["OPEN", "OVERDUE", "PAID"] as const;

const ACCOUNT_PAYABLE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "issue_date",
    "due_date",
    "payment_date",
    "amount",
    "amount_paid",
    "category",
    // Not "supplier": the payee column also shows free-text payees, which
    // an order by the supplier's name would scatter.
    "vehicle",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: ACCOUNT_PAYABLE_STATUS_GROUPS },
    category: { param: "category", values: ACCOUNT_PAYABLE_CATEGORIES },
  },
});

interface NamedRef {
  id: string;
  name: string;
}

/** A bill as the API streams it: columns, related names and the situation. */
interface AccountPayableRow {
  id: string;
  issue_date: string;
  due_date: string;
  payment_date: string | null;
  amount: number;
  amount_paid: number | null;
  category: string | null;
  category_description: string | null;
  businessId: string;
  branchId: string;
  serviceOrderId: string | null;
  registrationUserId: string;
  supplierId: string | null;
  payee_name: string | null;
  vehicleId: string | null;
  description: string | null;
  document_number: string | null;
  createdById: string | null;
  created_at: string;
  updated_at: string;
  branch?: {
    id: string;
    corporate_reason: string;
    fantasy_name: string | null;
  } | null;
  serviceOrder?: {
    id: string;
    date: string;
    maintenance_type: string;
    vehicle?: { license_plate: string; description: string } | null;
  } | null;
  registrationUser?: NamedRef | null;
  createdBy?: NamedRef | null;
  supplier?: NamedRef | null;
  vehicle?: { id: string; license_plate: string; description: string } | null;
  /** Decided by the API from the company's business day (decision 8.4). */
  status: AccountPayableStatus;
  status_group: AccountPayableStatusGroup;
  /** "YYYY-MM-DD" in the company's zone: shown as a day, never shifted. */
  due_day: string;
  payment_day: string | null;
  remaining_amount: number;
}

/** The list's `meta.searchMeta`, as the API streams it. */
interface AccountPayableSearchMeta {
  total?: number;
  open?: number;
  overdue?: number;
  paid?: number;
  openAmount?: number;
  overdueAmount?: number;
  paidAmount?: number;
  facets?: { status?: FacetCount[] };
}

/** The sort and filter params to forward from the page's URL to the API. */
function accountPayableListQuery(
  searchParams: PageSearchParams | Pick<URLSearchParams, "get" | "getAll">,
): Record<string, string> {
  return serverTableQuery(searchParams, ACCOUNT_PAYABLE_TABLE);
}

export {
  ACCOUNT_PAYABLE_STATUS_GROUPS,
  ACCOUNT_PAYABLE_TABLE,
  accountPayableListQuery,
  type AccountPayableRow,
  type AccountPayableSearchMeta,
};
