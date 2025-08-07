import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardTableBranchCollumns } from "../../_components/dashboard/dashboard-branch/dashboard-table-branch-collumns";

import { DashboardBranchToolbar } from "../../_components/dashboard/dashboard-branch/dashboard-branch-toolbar";
import { DashboardBranchProps } from "../../_components/dashboard/dashboard-branch/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface BranchQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Filiais",
    description: `
      Centralize o controle de todas as suas filiais em um só lugar. 
      Visualize, cadastre e organize unidades regionais com precisão, 
      monitore desempenho por localidade e otimize operações descentralizadas 
      com nossa plataforma integrada de gestão de filiais. 
      Expanda seu negócio com governança e visibilidade total.`,
  };
}

const Branch = async ({
  searchParams,
}: BranchQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let branchResponseError = {
    error: false,
    errorMessage: "",
  };

  let branch: DashboardBranchProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/branch/list-branch?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-branch", "delete-branch", "update-branch"],
        },
      },
    );
  } catch (error) {
    branchResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de filiais",
    };

    branch = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      branchResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de filiais",
      };

      branch = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      branch = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Filiais"}
        description="Controle centralizado de unidades regionais. Cadastre, monitore e gerencie suas filiais com precisão e eficiência."
      />

      <DataTable
        data={branch}
        meta={meta}
        columns={dashboardTableBranchCollumns}
        responseError={branchResponseError}
        toolbar={createElement(DashboardBranchToolbar)}
      />
    </PageContainer>
  );
};

export default Branch;
