import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardTableFuelTypeCollumns } from "../../_components/dashboard/dashboard-fuel-type/dashboard-table-fuel-type-collumns";

import { DashboardFuelTypeProps } from "../../_components/dashboard/dashboard-fuel-type/dto";
import { DashboardFuelTypeToolbar } from "../../_components/dashboard/dashboard-fuel-type/dashboard-fuel-type-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FuelTypeQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipo de Combustível",
    description: `
      Gerencie facilmente seus tipos de combustíveis cadastrados. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const FuelType = async ({
  searchParams,
}: FuelTypeQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

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
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
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
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fuelType = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Tipo de Combustível"}
        description="Gerencie os tipos de combustíveis cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <DataTable
        data={fuelType}
        meta={meta}
        columns={dashboardTableFuelTypeCollumns}
        responseError={fuelTypeResponseError}
        toolbar={createElement(DashboardFuelTypeToolbar)}
      />
    </PageContainer>
  );
};

export default FuelType;
