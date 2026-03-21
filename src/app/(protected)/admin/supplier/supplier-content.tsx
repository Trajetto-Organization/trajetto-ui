import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableSupplierCollumns } from "@/app/(protected)/_components/admin/supplier/table-supplier-collumns";

import type { SupplierProps } from "@/app/(protected)/_components/admin/supplier/supplier.types";
import { SupplierToolbar } from "@/app/(protected)/_components/admin/supplier/supplier-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { supplierStats } from "./stats-config";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface SupplierContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const SupplierContent = async ({
  searchParams,
  token,
}: SupplierContentProps): Promise<JSX.Element> => {
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      supplier = data;
      meta = metaParsed;
    }
  }

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
    <>
      <PageStats stats={supplierStats} data={statsData} columns={4} />
      <DataTable
        data={supplier}
        meta={meta}
        columns={tableSupplierCollumns}
        responseError={supplierResponseError}
        toolbar={createElement(SupplierToolbar)}
      />
    </>
  );
};

export { SupplierContent };
