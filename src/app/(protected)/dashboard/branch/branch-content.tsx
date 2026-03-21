import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { dashboardTableBranchCollumns } from "@/app/(protected)/_components/dashboard/dashboard-branch/dashboard-table-branch-collumns";

import type { DashboardBranchProps } from "@/app/(protected)/_components/dashboard/dashboard-branch/dashboard-branch.types";
import { DashboardBranchToolbar } from "@/app/(protected)/_components/dashboard/dashboard-branch/dashboard-branch-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { branchStats } from "./stats-config";
import { BranchActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface BranchContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const BranchContent = async ({
  searchParams,
  token,
}: BranchContentProps): Promise<JSX.Element> => {
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      branch = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalBranches: meta.total,
    withErpCode: branch.filter((b) => b.erp_code && b.erp_code !== null).length,
    withFantasyName: branch.filter(
      (b) => b.fantasy_name && b.fantasy_name.trim() !== "",
    ).length,
    withComplement: branch.filter(
      (b) => b.complement && b.complement.trim() !== "",
    ).length,
  };

  return (
    <>
      <BranchActions />
      <PageStats stats={branchStats} data={statsData} columns={4} />

      <DataTable
        data={branch}
        meta={meta}
        columns={dashboardTableBranchCollumns}
        responseError={branchResponseError}
        toolbar={createElement(DashboardBranchToolbar)}
      />
    </>
  );
};

export { BranchContent };
