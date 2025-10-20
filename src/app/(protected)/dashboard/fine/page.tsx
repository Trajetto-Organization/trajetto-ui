import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardTableFineColumns } from "../../_components/dashboard/dashboard-fine/dashboard-table-fine-collumns";

import { DashboardFineProps } from "../../_components/dashboard/dashboard-fine/dto";
import { DashboardFineToolbar } from "../../_components/dashboard/dashboard-fine/dashboard-fine-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

import { fineStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { FineActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FineQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Multas",
    description: `
      Gerencie facilmente as multas cadastradas. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Fine = async ({
  searchParams,
}: FineQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let fineResponseError = {
    error: false,
    errorMessage: "",
  };

  let fine: DashboardFineProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fines/list-fine?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-fine", "delete-fine", "update-fine"],
        },
      },
    );
  } catch (error) {
    fineResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de multas",
    };

    fine = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      fineResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de multas",
      };

      fine = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fine = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalFines: meta.total,
    paidFines: fine.filter((f) => f.payment_date !== null).length,
    pendingFines: fine.filter((f) => f.payment_date === null).length,
    totalPoints: fine.reduce((sum, f) => sum + (f.points || 0), 0),
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Multas"}
        description="Gerencie as multas cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <FineActions hasData={fine.length > 0} />
      <PageStats stats={fineStats} data={statsData} columns={4} />

      <DataTable
        data={fine}
        meta={meta}
        columns={dashboardTableFineColumns}
        responseError={fineResponseError}
        toolbar={createElement(DashboardFineToolbar)}
      />
    </PageContainer>
  );
};

export default Fine;
