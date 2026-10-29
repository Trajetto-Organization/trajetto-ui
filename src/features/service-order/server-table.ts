import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  MAINTENANCE_TYPE_LABELS,
  SERVICE_ORDER_STATUS_LABELS,
} from "./lib/service-order-rules";

/**
 * The service order list's server-side table (decision 8.8). Sort keys and
 * facet params are the API's (trajetto-api list-service-order-schema); the
 * column ids match them, so the URL `sort` value is the column id. No
 * directive: the server content that asks the API imports this too.
 */
const SERVICE_ORDER_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "date",
    "completion_date",
    "total_amount",
    "maintenance_type",
    "vehicleLicensePlate",
    "responsibleUserName",
    "supplierName",
    "branchName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: {
      param: "status",
      values: Object.keys(SERVICE_ORDER_STATUS_LABELS),
    },
    maintenance_type: {
      param: "maintenanceType",
      values: Object.keys(MAINTENANCE_TYPE_LABELS),
    },
    branchName: { param: "branchId", values: "uuid" },
  },
});

/** The list's `meta.searchMeta`, as the API streams it. */
interface ServiceOrderSearchMeta {
  total?: number;
  open?: number;
  completed?: number;
  totalAmount?: number;
  facets?: {
    status?: FacetCount[];
    maintenanceType?: FacetCount[];
    branchId?: FacetCount[];
  };
}

/** One listed order, as the API streams it. */
interface ServiceOrderRow {
  id: string;
  date: string;
  completion_date: string | null;
  maintenance_type: "INTERNAL" | "EXTERNAL";
  total_amount: number | string;
  description?: string | null;
  current_mileage_at_service: number | null;
  maintenance_interval_km_at_service: number | null;
  last_maintenance_mileage_at_service: number | null;
  new_mileage_after_service: number | null;
  businessId: string;
  vehicleId: string;
  responsibleUserId: string;
  branchId: string;
  supplierId: string | null;
  latitude: number | null;
  longitude: number | null;
  created_from: string;
  created_at: string;
  updated_at: string;
  business?: { corporate_reason: string } | null;
  vehicle?: { license_plate: string; description: string } | null;
  responsibleUser?: { name: string; email: string } | null;
  branch?: { corporate_reason: string; fantasy_name: string | null } | null;
  supplier?: { name: string } | null;
  parts?: Array<{
    id: string;
    quantity: number;
    unit_price: number | string;
    discount_percentage?: number | string | null;
    part: { id: string; description: string };
  }>;
  parts_total?: number;
  parts_count?: number;
  accounts_payable_count?: number;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * The sort and filter params to add to the list request, read from the
 * page's searchParams, next to page, pageSize, search and businessId. The
 * export sends the same ones (decision 5.8).
 */
function serviceOrderListQuery(
  searchParams: PageSearchParams | Pick<URLSearchParams, "get" | "getAll">,
): Record<string, string> {
  return serverTableQuery(searchParams, SERVICE_ORDER_TABLE);
}

export {
  SERVICE_ORDER_TABLE,
  serviceOrderListQuery,
  type PageSearchParams,
  type ServiceOrderRow,
  type ServiceOrderSearchMeta,
};
