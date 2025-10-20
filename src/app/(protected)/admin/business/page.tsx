import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { BusinessToolbar } from "../../_components/admin/business/business-toolbar";

import { tableBusinessCollumns } from "../../_components/admin/business/table-business-collumns";

import { getCookies } from "@/actions/cookies";
import { BusinessProps } from "../../_components/admin/business/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";

import { businessStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { BusinessActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface BusinessQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Empresas",
    description: `
      Gerencie facilmente suas empresas cadastradas. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Business = async ({
  searchParams,
}: BusinessQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let businessResponseError = {
    error: false,
    errorMessage: "",
  };

  let business: BusinessProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/business/list-business?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-business", "delete-business", "update-business"],
        },
      },
    );
  } catch (error) {
    businessResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de empresas",
    };

    business = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      businessResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de empresas",
      };

      business = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      business = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalBusiness: meta.total,
    withErpCode: business.filter((b) => b.erp_code && b.erp_code !== "N/A")
      .length,
    topStates: (() => {
      const stateCount: Record<string, number> = {};
      business.forEach((b) => {
        if (b.uf && b.uf !== "N/A") {
          stateCount[b.uf] = (stateCount[b.uf] || 0) + 1;
        }
      });

      const sorted = Object.entries(stateCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      return sorted.length > 0
        ? sorted.map(([uf, count]) => `${uf} (${count})`).join(", ")
        : "N/A";
    })(),
    topCities: (() => {
      const cityCount: Record<string, number> = {};
      business.forEach((b) => {
        if (b.city && b.city !== "N/A") {
          cityCount[b.city] = (cityCount[b.city] || 0) + 1;
        }
      });

      const sorted = Object.entries(cityCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
      return sorted.length > 0
        ? sorted.map(([city, count]) => `${city} (${count})`).join(", ")
        : "N/A";
    })(),
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Empresas"}
        description="Gerencie empresas cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <BusinessActions />
      <PageStats stats={businessStats} data={statsData} columns={4} />

      <DataTable
        data={business}
        meta={meta}
        columns={tableBusinessCollumns}
        responseError={businessResponseError}
        toolbar={createElement(BusinessToolbar)}
      />
    </PageContainer>
  );
};

export default Business;
