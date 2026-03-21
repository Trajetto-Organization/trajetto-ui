import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableBusinessCollumns } from "@/app/(protected)/_components/admin/business/table-business-collumns";

import type { BusinessProps } from "@/app/(protected)/_components/shared/common.types";
import { BusinessToolbar } from "@/app/(protected)/_components/admin/business/business-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { businessStats } from "./stats-config";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface BusinessContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const BusinessContent = async ({
  searchParams,
  token,
}: BusinessContentProps): Promise<JSX.Element> => {
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      business = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalBusiness: meta.total,
    withErpCode: business.filter((b) => b.erp_code && b.erp_code !== null)
      .length,
    topStates: (() => {
      const stateCount: Record<string, number> = {};
      business.forEach((b) => {
        if (b.uf && b.uf !== null) {
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
        if (b.city && b.city !== null) {
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
    <>
      <PageStats stats={businessStats} data={statsData} columns={4} />
      <DataTable
        data={business}
        meta={meta}
        columns={tableBusinessCollumns}
        responseError={businessResponseError}
        toolbar={createElement(BusinessToolbar)}
      />
    </>
  );
};

export { BusinessContent };
