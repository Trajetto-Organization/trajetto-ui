import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableActivityColumns } from "@/app/(protected)/_components/admin/activity-log/table-activity-columns";

import type { ActivityProps } from "@/app/(protected)/_components/admin/activity-log/activity-log.types";
import { ActivityToolbar } from "@/app/(protected)/_components/admin/activity-log/activity-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";

import { getActivitySummary } from "@/actions/activity/get-activity-summary";
import { ActivityStats } from "@/features/activity/stats";

import { ActivityTimelineFeed } from "@/features/activity/timeline-feed";
import { listActivitiesCursor } from "@/actions/activity/list-activities-cursor";
import {
  ActivityViewSwitch,
  type ActivityView,
} from "@/features/activity/view-switch";

import { ActivityPeriodSwitch } from "@/features/activity/period-switch";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ActivityContentProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    view?: string;
    period?: string;
  };
  token: string;
}

const ActivityContent = async ({
  searchParams,
  token,
}: ActivityContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  const activeView: ActivityView =
    searchParams.view === "table" ? "table" : "timeline";

  const period: "7d" | "30d" = searchParams.period === "30d" ? "30d" : "7d";

  // Aggregates for the cards come from the API over the whole period —
  // counting the loaded page would describe the page, not the operation.
  const summaryResponse = await getActivitySummary(period);
  const summary = summaryResponse.success ? (summaryResponse.data ?? null) : null;

  let activityResponseError = {
    error: false,
    errorMessage: "",
  };

  let activity: ActivityProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  // The timeline reads its own feed: cursor paginated and bounded by the
  // same window the cards describe. Fetching it only for the view that shows
  // it keeps the table's request untouched.
  const timelineResponse =
    activeView === "timeline"
      ? await listActivitiesCursor({
          period,
          search: search || undefined,
          businessId: undefined,
        })
      : null;

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/activity/list?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["update-activity"],
        },
      },
    );
  } catch (error) {
    activityResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de atividades",
    };

    activity = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      activityResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de atividades",
      };

      activity = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      activity = data;
      meta = metaParsed;
    }
  }

  return (
    <>
      <div
        className="flex flex-col gap-3 mt-9 mb-6 sm:flex-row
        sm:items-center sm:justify-between"
      >
        <ActivityViewSwitch activeView={activeView} />
        <ActivityPeriodSwitch period={period} />
      </div>

      <ActivityStats summary={summary} />

      {activeView === "timeline" ? (
        <div className="my-9">
          <ActivityTimelineFeed
            initialActivities={timelineResponse?.data ?? []}
            initialCursor={timelineResponse?.nextCursor ?? null}
            initialHasMore={timelineResponse?.hasMore ?? false}
            period={period}
            search={search || undefined}
            showBusiness={true}
            responseError={
              timelineResponse && !timelineResponse.success
                ? { error: true, errorMessage: timelineResponse.message }
                : activityResponseError
            }
          />
        </div>
      ) : (
      <DataTable
        data={activity}
        meta={meta}
        columns={tableActivityColumns}
        responseError={activityResponseError}
        toolbar={createElement(ActivityToolbar)}
      />
      )}
    </>
  );
};

export { ActivityContent };
