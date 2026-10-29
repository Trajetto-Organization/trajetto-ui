import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The access-profile list's server-side table (decision 8.8). Sort keys are
 * the API's (trajetto-api list-profile-access-schema) and the column ids
 * match them. No facets: the list is short, and its numbers are the users and
 * permissions each profile holds, counted by the database.
 */
const PROFILE_ACCESS_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "name",
    "usersCount",
    "permissionsCount",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {},
});

type ParamSource = Parameters<typeof serverTableQuery>[0];

/** The sort params to add to `/profile-access/list-profile-access`. */
function profileAccessListQuery(
  searchParams: ParamSource,
): Record<string, string> {
  return serverTableQuery(searchParams, PROFILE_ACCESS_TABLE);
}

export { PROFILE_ACCESS_TABLE, profileAccessListQuery };
