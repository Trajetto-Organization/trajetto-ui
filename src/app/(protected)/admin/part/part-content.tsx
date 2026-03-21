import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tablePartCollumns } from "@/app/(protected)/_components/admin/part/table-part-collumns";

import type { PartProps } from "@/app/(protected)/_components/admin/part/part.types";
import { PartToolbar } from "@/app/(protected)/_components/admin/part/part-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { partStats } from "./stats-config";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface PartContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const PartContent = async ({
  searchParams,
  token,
}: PartContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let partResponseError = {
    error: false,
    errorMessage: "",
  };

  let part: PartProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/part/list-part?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-part", "delete-part", "update-part"],
        },
      },
    );
  } catch (error) {
    partResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de peças",
    };

    part = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      partResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de peças",
      };

      part = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      part = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalParts: meta.total,
    withSupplier: part.filter((p) => p.supplierId !== null).length,
    averagePrice: (() => {
      if (part.length === 0) return "R$ 0,00";

      const total = part.reduce((sum, p) => {
        const cleanValue = String(p.unit_price || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");

        const price = parseFloat(cleanValue);
        return sum + (isNaN(price) ? 0 : price);
      }, 0);

      const average = total / part.length;
      return average.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    })(),
    totalValue: part
      .reduce((sum, p) => {
        const cleanValue = String(p.unit_price || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");

        const price = parseFloat(cleanValue);
        return sum + (isNaN(price) ? 0 : price);
      }, 0)
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
  };

  return (
    <>
      <PageStats stats={partStats} data={statsData} columns={4} />
      <DataTable
        data={part}
        meta={meta}
        columns={tablePartCollumns}
        responseError={partResponseError}
        toolbar={createElement(PartToolbar)}
      />
    </>
  );
};

export { PartContent };
