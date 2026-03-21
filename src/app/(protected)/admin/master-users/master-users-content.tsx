import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableMasterUserCollumns } from "@/app/(protected)/_components/admin/master-user/master-user-collumns";

import type { MasterUserProps } from "@/app/(protected)/_components/admin/master-user/master-user.types";
import { MasterUserToolbar } from "@/app/(protected)/_components/admin/master-user/master-user-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { masterUsersStats } from "./stats-config";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface MasterUsersContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const MasterUsersContent = async ({
  searchParams,
  token,
}: MasterUsersContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let masterUsersResponseError = {
    error: false,
    errorMessage: "",
  };

  let masterUsers: MasterUserProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/user/list-master-users?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: [
            "create-master-user",
            "update-master-user",
            "delete-master-user",
            "revoke-master-user",
          ],
        },
      },
    );
  } catch (error) {
    masterUsersResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de usuários Master.",
    };

    masterUsers = [];
    meta = { total: 0, page: 1, pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      masterUsersResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de usuários Master.",
      };

      masterUsers = [];
      meta = { total: 0, page: 1, pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      masterUsers = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalMasterUsers: meta.total,
    activeMasterUsers: masterUsers.filter(
      (user) => user.access_revoked === false,
    ).length,
    twoFactorEnabled: masterUsers.filter(
      (user) => user.two_factor_enabled === true,
    ).length,
    emailVerified: masterUsers.filter((user) => user.email_verified).length,
  };

  return (
    <>
      <PageStats stats={masterUsersStats} data={statsData} columns={4} />
      <DataTable
        data={masterUsers}
        meta={meta}
        columns={tableMasterUserCollumns}
        responseError={masterUsersResponseError}
        toolbar={createElement(MasterUserToolbar)}
      />
    </>
  );
};

export { MasterUsersContent };
