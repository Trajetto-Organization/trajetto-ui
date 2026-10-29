import { redirect } from "next/navigation";

import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

import { getActivitySummary } from "@/actions/activity/get-activity-summary";
import { listActivitiesCursor } from "@/actions/activity/list-activities-cursor";

import { ActivityStats } from "../stats";
import { ActivityTimelineFeed } from "../timeline-feed";
import { ActivityViewSwitch, type ActivityView } from "../view-switch";

import { ActivityPageActions } from "../page-actions";
import { ActivityTable } from "../table";
import type { ActivityScope, ActivityTableRow } from "../table/columns";

import { activityListQuery, type PageSearchParams } from "../lib/server-table";

/**
 * The one cache tag of the activity reads (FLEET-ACT-6: the table used
 * "create-activity" and the button revalidated "update-activity"). It is the
 * allowlisted one (lib/revalidation-tags.ts); the summary and feed actions
 * use it too.
 */
const ACTIVITY_TAG = "update-activity";

interface ActivityContentProps {
  mode: ActivityScope;
  searchParams: PageSearchParams;
  token: string;
}

const firstParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

async function fetchActivityTable(
  token: string,
  searchParams: PageSearchParams,
  page: number,
  pageSize: number,
  search: string,
): Promise<{
  rows: ActivityTableRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  /** A 403 names its refusal (decision 4.1): shown as such, not as an error. */
  refusal?: AccessError;
}> {
  const empty = { total: 0, page, pageSize };

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...activityListQuery(searchParams),
  });

  const failed = (errorMessage: string) => ({
    rows: [] as ActivityTableRow[],
    meta: empty,
    responseError: { error: true, errorMessage },
  });

  let response: Response;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/activity/list?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: [ACTIVITY_TAG] },
      },
    );
  } catch {
    return failed(
      "Ocorreu um erro inesperado ao tentar recuperar a lista de atividades",
    );
  }

  if (response.status === 401) redirect("/login");

  const refusal = await readAccessError(response);

  if (refusal) {
    return {
      ...failed(refusal.message ?? "Sem acesso ao registro de atividades."),
      refusal,
    };
  }

  if (!response.ok) {
    return failed("Houve um erro ao tentar recuperar a lista de atividades");
  }

  const { meta, data } = await parseNDJSON(response);

  return {
    rows: data as ActivityTableRow[],
    meta: meta ?? { ...empty, total: data.length },
    responseError: { error: false, errorMessage: "" },
  };
}

/**
 * Registro de Atividades, one screen for /admin and /dashboard (decision
 * 8.7). The MASTER reads every company's trail, with the company column; a
 * company admin reads their own (the API scopes it).
 *
 * FLEET-ACT-6: the table's list (findMany + COUNT of the whole scope) was
 * fetched even for the timeline, after the summary and the feed, one await
 * at a time. Now the view decides what is read, and the reads run together.
 */
const ActivityContent = async ({
  mode,
  searchParams,
  token,
}: ActivityContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  const activeView: ActivityView =
    firstParam(searchParams.view) === "table" ? "table" : "timeline";
  const period: "7d" | "30d" =
    firstParam(searchParams.period) === "30d" ? "30d" : "7d";

  // Aggregates for the cards come from the API over the whole period —
  // counting the loaded page would describe the page, not the operation.
  const [summaryResponse, view] = await Promise.all([
    getActivitySummary(period),
    activeView === "timeline"
      ? listActivitiesCursor({ period, search: search || undefined }).then(
          (timeline) => ({ kind: "timeline" as const, timeline }),
        )
      : fetchActivityTable(token, searchParams, page, pageSize, search).then(
          (table) => ({ kind: "table" as const, table }),
        ),
  ]);

  const summary = summaryResponse.success
    ? (summaryResponse.data ?? null)
    : null;

  return (
    <div className="my-6 space-y-6">
      {/* One line: the reading (timeline or table) on the left, the period
          and Atualizar on the right — wrapping as a whole only when they no
          longer fit, and stacked on a phone. */}
      <ProtectedPageToolbar
        context={<ActivityViewSwitch activeView={activeView} />}
        actions={<ActivityPageActions period={period} />}
      />

      <ActivityStats summary={summary} />

      {view.kind === "timeline" ? (
        <ActivityTimelineFeed
          initialActivities={view.timeline.data}
          initialCursor={view.timeline.nextCursor}
          initialHasMore={view.timeline.hasMore}
          period={period}
          search={search || undefined}
          showBusiness={mode === "admin"}
          responseError={
            view.timeline.success
              ? { error: false, errorMessage: "" }
              : { error: true, errorMessage: view.timeline.message }
          }
        />
      ) : view.table.refusal ? (
        <AccessErrorState
          kind={view.table.refusal.kind}
          audience={mode === "admin" ? "master" : "company"}
          message={view.table.refusal.message}
        />
      ) : (
        <ActivityTable
          mode={mode}
          data={view.table.rows}
          meta={view.table.meta}
          responseError={view.table.responseError}
        />
      )}
    </div>
  );
};

export { ACTIVITY_TAG, ActivityContent };
