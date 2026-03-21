import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableVehicleTypeCollumns } from "@/app/(protected)/_components/admin/vehicle-type/table-vehicle-type-collumns";

import type { VehicleTypeProps } from "@/app/(protected)/_components/admin/vehicle-type/vehicle-type.types";
import { VehicleTypeToolbar } from "@/app/(protected)/_components/admin/vehicle-type/vehicle-type-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface VehicleTypeContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const VehicleTypeContent = async ({
  searchParams,
  token,
}: VehicleTypeContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let vehicleTypeResponseError = {
    error: false,
    errorMessage: "",
  };

  let vehicleType: VehicleTypeProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/vehicle-type/list-vehicle-type?page=${page}&pageSize=${pageSize}&search=${search}`,
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
            "create-vehicle-type",
            "delete-vehicle-type",
            "update-vehicle-type",
          ],
        },
      },
    );
  } catch (error) {
    vehicleTypeResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de tipos dos veículos",
    };

    vehicleType = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      vehicleTypeResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de tipos dos veículos",
      };

      vehicleType = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      vehicleType = data;
      meta = metaParsed;
    }
  }

  return (
    <>
      <DataTable
        data={vehicleType}
        meta={meta}
        columns={tableVehicleTypeCollumns}
        responseError={vehicleTypeResponseError}
        toolbar={createElement(VehicleTypeToolbar)}
      />
    </>
  );
};

export { VehicleTypeContent };
