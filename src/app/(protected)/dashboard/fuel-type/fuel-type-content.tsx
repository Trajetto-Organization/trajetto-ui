import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { dashboardTableFuelTypeCollumns } from "@/app/(protected)/_components/dashboard/dashboard-fuel-type/dashboard-table-fuel-type-collumns";

import type { DashboardFuelTypeProps } from "@/app/(protected)/_components/dashboard/dashboard-fuel-type/dashboard-fuel-types.types";
import { DashboardFuelTypeToolbar } from "@/app/(protected)/_components/dashboard/dashboard-fuel-type/dashboard-fuel-type-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FuelTypeContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const FuelTypeContent = async ({
  searchParams,
  token,
}: FuelTypeContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let fuelTypeResponseError = {
    error: false,
    errorMessage: "",
  };

  let fuelType: DashboardFuelTypeProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fuel-type/list-fuel-type?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-fuel-type", "delete-fuel-type", "update-fuel-type"],
        },
      },
    );
  } catch (error) {
    fuelTypeResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de combustíveis",
    };

    fuelType = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      fuelTypeResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de combustíveis",
      };

      fuelType = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fuelType = data;
      meta = metaParsed;
    }
  }

  return (
    <DataTable
      data={fuelType}
      meta={meta}
      columns={dashboardTableFuelTypeCollumns}
      responseError={fuelTypeResponseError}
      toolbar={createElement(DashboardFuelTypeToolbar)}
    />
  );
};

export { FuelTypeContent };
