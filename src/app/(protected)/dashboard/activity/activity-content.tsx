import { createElement } from "react";
import { redirect } from "next/navigation";

import type { DashboardActivityProps } from "@/app/(protected)/_components/dashboard/dashboard-activity-log/dashboard-activity-log.types";
import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { dashboardTableActivityColumns } from "@/app/(protected)/_components/dashboard/dashboard-activity-log/dashboard-table-activity-columns";
import { DashboardActivityToolbar } from "@/app/(protected)/_components/dashboard/dashboard-activity-log/dashboard-activity-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ActivityContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const ActivityContent = async ({
  searchParams,
  token,
}: ActivityContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let activityResponseError = {
    error: false,
    errorMessage: "",
  };

  let activity: DashboardActivityProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

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
          tags: ["create-activity"],
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
    <DataTable
      data={activity}
      meta={meta}
      columns={dashboardTableActivityColumns}
      responseError={activityResponseError}
      toolbar={createElement(DashboardActivityToolbar)}
    />
  );
};

export { ActivityContent };
