import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardTableFuelColumns } from "../../_components/dashboard/dashboard-fuel/dashboard-table-fuel-collumns";

import { DashboardFuelProps } from "../../_components/dashboard/dashboard-fuel/dto";
import { DashboardFuelToolbar } from "../../_components/dashboard/dashboard-fuel/dashboard-fuel-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FuelQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Abastecimento",
    description: `
      Gerencie facilmente os abastecimentos cadastrados. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Fuel = async ({
  searchParams,
}: FuelQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let fuelResponseError = {
    error: false,
    errorMessage: "",
  };

  let fuel: DashboardFuelProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fuel/list-fuel?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-fuel", "delete-fuel", "update-fuel"],
        },
      },
    );
  } catch (error) {
    fuelResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de abastecimentos",
    };

    fuel = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      fuelResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de abastecimentos",
      };

      fuel = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fuel = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Abastecimento"}
        description="Gerencie os abastecimentos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <DataTable
        data={fuel}
        meta={meta}
        columns={dashboardTableFuelColumns}
        responseError={fuelResponseError}
        toolbar={createElement(DashboardFuelToolbar)}
      />
    </PageContainer>
  );
};

export default Fuel;
