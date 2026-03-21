import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableFineCollumns } from "@/app/(protected)/_components/admin/fine/table-fine-collumns";

import type { FineProps } from "@/app/(protected)/_components/admin/fine/fine.types";
import { FineToolbar } from "@/app/(protected)/_components/admin/fine/fine-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { fineStats } from "./stats-config";
import { FineActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FineContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const FineContent = async ({
  searchParams,
  token,
}: FineContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let fineResponseError = {
    error: false,
    errorMessage: "",
  };

  let fine: FineProps[] = [];
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fine = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalFines: meta.total,
    paidFines: fine.filter((f) => f.payment_date !== null).length,
    pendingFines: fine.filter((f) => f.payment_date === null).length,
    totalPoints: fine.reduce((sum, f) => sum + (f.points || 0), 0),
  };

  return (
    <>
      <FineActions hasData={fine.length > 0} />
      <PageStats stats={fineStats} data={statsData} columns={4} />
      <DataTable
        data={fine}
        meta={meta}
        columns={tableFineCollumns}
        responseError={fineResponseError}
        toolbar={createElement(FineToolbar)}
      />
    </>
  );
};

export { FineContent };
