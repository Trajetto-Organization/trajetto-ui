import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  ACTIVITY_STATUS_CATALOG,
  ACTIVITY_TYPE_CATALOG,
} from "./activity-catalog";

/**
 * The activity table's server-side contract (decision 8.8, FLEET-ACT-3).
 * The filters used to run over the ten rows of the page; the facets are now
 * the API's (trajetto-api list-activities-schema) and only `created_at`
 * orders — the column the indexes serve. Column ids are the facet keys; the
 * author role column is `userRole` and travels as `role`.
 *
 * No directive: the server content imports it too.
 */
const ACTIVITY_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["created_at"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: {
      param: "status",
      values: ACTIVITY_STATUS_CATALOG.map((entry) => entry.value),
    },
    type: {
      param: "type",
      values: ACTIVITY_TYPE_CATALOG.map((entry) => entry.value),
    },
    action: { param: "action", values: ["create", "update", "delete"] },
    userRole: {
      param: "role",
      values: [
        "MASTER",
        "BUSINESS_ADMIN",
        "BUSINESS_USER",
        "DRIVER",
        "PLATFORM",
      ],
    },
  },
});

type PageSearchParams = Record<string, string | string[] | undefined>;

/** The sort and facet params to forward from the page's URL to the API. */
function activityListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, ACTIVITY_TABLE);
}

export { ACTIVITY_TABLE, activityListQuery, type PageSearchParams };
