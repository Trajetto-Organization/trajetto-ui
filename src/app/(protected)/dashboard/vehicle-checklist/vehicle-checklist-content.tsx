import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { dashboardTableVehicleChecklistColumns } from "@/app/(protected)/_components/dashboard/dashboard-vehicle-checklist/dashboard-table-vehicle-checklist-collumns";

import type { DashboardVehicleChecklistProps } from "@/app/(protected)/_components/dashboard/dashboard-vehicle-checklist/dashboard-vehicle-checklist.types";
import { DashboardVehicleChecklistToolbar } from "@/app/(protected)/_components/dashboard/dashboard-vehicle-checklist/dashboard-vehicle-checklist-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { vehicleChecklistStats } from "./stats-config";
import { VehicleChecklistActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface VehicleChecklistContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const VehicleChecklistContent = async ({
  searchParams,
  token,
}: VehicleChecklistContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let vehicleChecklistResponseError = {
    error: false,
    errorMessage: "",
  };

  let vehicleChecklists: DashboardVehicleChecklistProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/vehicle-checklist/list-vehicle-checklist?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: [
            "create-vehicle-checklist",
            "delete-vehicle-checklist",
            "update-vehicle-checklist",
          ],
        },
      },
    );
  } catch (error) {
    vehicleChecklistResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de checklists veiculares",
    };

    vehicleChecklists = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      vehicleChecklistResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de checklists veiculares",
      };

      vehicleChecklists = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      vehicleChecklists = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalChecklists: meta.total,
    goodCondition: vehicleChecklists.filter(
      (vc) => vc.overall_condition === "approved",
    ).length,
    regularCondition: vehicleChecklists.filter(
      (vc) => vc.overall_condition === "approved_with_restrictions",
    ).length,
    badCondition: vehicleChecklists.filter(
      (vc) => vc.overall_condition === "rejected",
    ).length,
  };

  return (
    <>
      <VehicleChecklistActions hasData={vehicleChecklists.length > 0} />
      <PageStats stats={vehicleChecklistStats} data={statsData} columns={4} />

      <DataTable
        data={vehicleChecklists}
        meta={meta}
        columns={dashboardTableVehicleChecklistColumns}
        responseError={vehicleChecklistResponseError}
        toolbar={createElement(DashboardVehicleChecklistToolbar)}
      />
    </>
  );
};

export { VehicleChecklistContent };
