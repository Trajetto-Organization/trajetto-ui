import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardTableVehicleTypeCollumns } from "../../_components/dashboard/dashboard-vehicle-type/dashboard-table-vehicle-type-collumns";

import { DashboardVehicleTypeToolbar } from "../../_components/dashboard/dashboard-vehicle-type/dashboard-vehicle-type-toolbar";
import { DashboardVehicleTypeProps } from "../../_components/dashboard/dashboard-vehicle-type/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface VehicleTypeQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipos de veículos",
    description: `
      Gerencie facilmente seus tipos de veículos cadastrados. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const VehicleType = async ({
  searchParams,
}: VehicleTypeQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let vehicleTypeResponseError = {
    error: false,
    errorMessage: "",
  };

  let vehicleType: DashboardVehicleTypeProps[] = [];
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
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
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
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      vehicleType = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Tipos de Veículos"}
        description="Gerencie os tipos de veículos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <DataTable
        data={vehicleType}
        meta={meta}
        columns={dashboardTableVehicleTypeCollumns}
        responseError={vehicleTypeResponseError}
        toolbar={createElement(DashboardVehicleTypeToolbar)}
      />
    </PageContainer>
  );
};

export default VehicleType;
