import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableVehicleCollumns } from "@/app/(protected)/_components/admin/vehicle/table-vehicle-collumns";

import type { VehicleProps } from "@/app/(protected)/_components/admin/vehicle/vehicle.types";
import { VehicleToolbar } from "@/app/(protected)/_components/admin/vehicle/vehicle-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { vehicleStats } from "./stats-config";
import { VehicleActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface VehicleContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const VehicleContent = async ({
  searchParams,
  token,
}: VehicleContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let vehicleResponseError = {
    error: false,
    errorMessage: "",
  };

  let vehicle: VehicleProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/vehicle/list-vehicle?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-vehicle", "delete-vehicle", "update-vehicle"],
        },
      },
    );
  } catch (error) {
    vehicleResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de veículos",
    };

    vehicle = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      vehicleResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de veículos",
      };

      vehicle = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      vehicle = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalVehicles: meta.total,
    activeVehicles: vehicle.filter((v) => v.status === "ACTIVE").length,
    inRoute: vehicle.filter((v) => v.status === "IN_ROUTE").length,
    outOfOperation: vehicle.filter(
      (v) => v.status === "INACTIVE" || v.status === "BLOCKED",
    ).length,
  };

  return (
    <>
      <VehicleActions hasData={vehicle.length > 0} />
      <PageStats stats={vehicleStats} data={statsData} columns={4} />
      <DataTable
        data={vehicle}
        meta={meta}
        columns={tableVehicleCollumns}
        responseError={vehicleResponseError}
        toolbar={createElement(VehicleToolbar)}
      />
    </>
  );
};

export { VehicleContent };
