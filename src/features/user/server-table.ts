import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  ACCESS_LABELS,
  ROLE_LABELS,
  TWO_FACTOR_LABELS,
} from "./lib/user-rules";

/**
 * The user list's server-side table (decision 8.8). Sort keys and facet
 * params are the API's (trajetto-api list-user-schema); the column ids match
 * them, so the URL `sort` value is the column id. No directive: the server
 * content that asks the API imports this too.
 */
const USER_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "name",
    "email",
    "role",
    "email_verified",
    "profileAccess",
    "driverName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    role: { param: "role", values: Object.keys(ROLE_LABELS) },
    access_revoked: { param: "access", values: Object.keys(ACCESS_LABELS) },
    two_factor_enabled: {
      param: "two_factor",
      values: Object.keys(TWO_FACTOR_LABELS),
    },
    // The profile NAME column filters by profile id: the options (and their
    // names) come from the server, scoped to the company.
    profileAccess: { param: "profileAccessId", values: "uuid" },
  },
});

/**
 * The MASTER list: masters have no profile nor driver, so neither the
 * columns nor the facets exist there.
 */
const MASTER_USER_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["created_at", "updated_at", "name", "email", "email_verified"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    access_revoked: { param: "access", values: Object.keys(ACCESS_LABELS) },
    two_factor_enabled: {
      param: "two_factor",
      values: Object.keys(TWO_FACTOR_LABELS),
    },
  },
});

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/** The sort and filter params to add to `/user/list-user`. */
function userListQuery(searchParams: ParamSource): Record<string, string> {
  return serverTableQuery(searchParams, USER_TABLE);
}

/** The sort and filter params to add to `/user/list-master-users`. */
function masterUserListQuery(
  searchParams: ParamSource,
): Record<string, string> {
  return serverTableQuery(searchParams, MASTER_USER_TABLE);
}

export { MASTER_USER_TABLE, USER_TABLE, masterUserListQuery, userListQuery };
