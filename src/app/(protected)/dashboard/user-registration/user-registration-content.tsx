import { createElement } from "react";

import { redirect } from "next/navigation";
import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { dashboardTableUserCollumns } from "@/app/(protected)/_components/dashboard/dashboard-user/dashboard-user-collumns";
import { DashboardUserToolbar } from "@/app/(protected)/_components/dashboard/dashboard-user/dashboard-user-toolbar";

import type { DashboardUserRegistrationProps } from "@/app/(protected)/_components/dashboard/dashboard-user/dashboard-user.types";
import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import { parseNDJSON } from "@/lib/parse-nd-json";

import { userRegistrationStats } from "./stats-config";
import { UserRegistrationActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
  search?: string;
}

interface UserRegistrationContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const UserRegistrationContent = async ({
  searchParams,
  token,
}: UserRegistrationContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let userRegistrationResponseError = {
    error: false,
    errorMessage: "",
  };

  let users: DashboardUserRegistrationProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/user/list-user?page=${page}&pageSize=${pageSize}&search=${search}`,
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
            "create-user-registration",
            "update-user-registration",
            "delete-user-registration",
            "revoke-user-registration",
          ],
        },
      },
    );
  } catch (error) {
    userRegistrationResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de usuários cadastrados.",
    };

    users = [];
    meta = { total: 0, page: 1, pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      userRegistrationResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de usuários cadastrados.",
      };

      users = [];
      meta = { total: 0, page: 1, pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      users = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalUsers: meta.total,
    activeUsers: users.filter((user) => user.access_revoked === false).length,
    twoFactorEnabled: users.filter((user) => user.two_factor_enabled === true)
      .length,
    emailVerified: users.filter((user) => user.email_verified).length,
  };

  return (
    <>
      <UserRegistrationActions />
      <PageStats stats={userRegistrationStats} data={statsData} columns={4} />

      <DataTable
        data={users}
        meta={meta}
        columns={dashboardTableUserCollumns}
        responseError={userRegistrationResponseError}
        toolbar={createElement(DashboardUserToolbar)}
      />
    </>
  );
};

export { UserRegistrationContent };
