import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { permissionKeys } from "@/lib/permissions";

import { FLAG_LABELS } from "./lib/permission-rules";

/**
 * The permission list's server-side table (decision 8.8). Sort keys and
 * facet params are the API's (trajetto-api list-permission-schema); the
 * column ids match them, so the URL `sort` value is the column id. No
 * directive: the server content that asks the API imports this too.
 */
const PERMISSION_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "action",
    "permissionKey",
    "profile_name",
    "canRead",
    "canWrite",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    permissionKey: { param: "permissionKey", values: [...permissionKeys] },
    // The profile NAME column filters by profile id: the options (and their
    // names) come from the server, scoped to the company.
    profile_name: { param: "profileAccessId", values: "uuid" },
    canRead: { param: "read", values: Object.keys(FLAG_LABELS) },
    canWrite: { param: "write", values: Object.keys(FLAG_LABELS) },
  },
});

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/** The sort and filter params to add to `/permission/list-permission`. */
function permissionListQuery(
  searchParams: ParamSource,
): Record<string, string> {
  return serverTableQuery(searchParams, PERMISSION_TABLE);
}

export { PERMISSION_TABLE, permissionListQuery };
