import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The fines list on the server-side table contract (decision 8.8). Sort
 * keys and facet params are the API's (trajetto-api list-fine-schema); the
 * column ids match them, so the URL `sort` value is the column id. No
 * directive: the server component that asks the API imports this too.
 */
const FINE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "violation_date",
    "due_date",
    "payment_date",
    "amount",
    "points",
    "violationCode",
    "driverName",
    "vehicleLicensePlate",
    "branchName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: ["PAID", "PENDING", "OVERDUE"] },
    branchName: { param: "branchId", values: "uuid" },
    violationCode: { param: "trafficViolationCodeId", values: "uuid" },
  },
});

type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * The sort and filter params to add to the list and the export, read from
 * the page's searchParams (decision 5.8: the file holds what the screen
 * shows).
 */
function fineListQuery(searchParams: PageSearchParams): Record<string, string> {
  return serverTableQuery(searchParams, FINE_TABLE);
}

export { FINE_TABLE, fineListQuery, type PageSearchParams };
