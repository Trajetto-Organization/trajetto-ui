import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardTableSupplierCollumns } from "../../_components/dashboard/dashboard-supplier/dashboard-table-supplier-collumns";

import { DashboardSupplierToolbar } from "../../_components/dashboard/dashboard-supplier/dashboard-supplier-toolbar";
import { SupplierProps } from "../../_components/admin/supplier/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

import { supplierStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { SupplierActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface SupplierQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Fornecedores",
    description: `
      Gerencie de forma integrada todos os seus fornecedores e parceiros comerciais. 
      Cadastre, visualize e controle informações detalhadas de cada fornecedor, 
      acompanhe históricos de fornecimento, mantenha dados de contato atualizados e 
      otimize seus processos de compra e gerenciamneto com a nossa plataforma.`,
  };
}

const Supplier = async ({
  searchParams,
}: SupplierQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let supplierResponseError = {
    error: false,
    errorMessage: "",
  };

  let supplier: SupplierProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/supplier/list-supplier?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-supplier", "delete-supplier", "update-supplier"],
        },
      },
    );
  } catch (error) {
    supplierResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de fornecedores",
    };

    supplier = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      supplierResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de fornecedores",
      };

      supplier = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      supplier = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalSuppliers: meta.total,
    withTelephone: supplier.filter((s) => s.telephone && s.telephone !== null)
      .length,
    withEmail: supplier.filter((s) => s.email && s.email !== null).length,
    topStates: (() => {
      const stateCount: Record<string, number> = {};
      supplier.forEach((s) => {
        if (s.uf && s.uf !== null) {
          stateCount[s.uf] = (stateCount[s.uf] || 0) + 1;
        }
      });

      const sorted = Object.entries(stateCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      return sorted.length > 0
        ? sorted.map(([uf, count]) => `${uf} (${count})`).join(", ")
        : "N/A";
    })(),
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Fornecedores"}
        description="Controle centralizado de parceiros comerciais. Cadastre, monitore e gerencie seus fornecedores."
      />

      <SupplierActions />
      <PageStats stats={supplierStats} data={statsData} columns={4} />

      <DataTable
        data={supplier}
        meta={meta}
        columns={dashboardTableSupplierCollumns}
        responseError={supplierResponseError}
        toolbar={createElement(DashboardSupplierToolbar)}
      />
    </PageContainer>
  );
};

export default Supplier;
