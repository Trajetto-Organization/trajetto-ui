import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableUserCollumns } from "@/app/(protected)/_components/admin/user/user-collumns";

import type { UserRegistrationProps } from "@/app/(protected)/_components/admin/user/user.types";
import { UserToolbar } from "@/app/(protected)/_components/admin/user/user-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { userRegistrationStats } from "./stats-config";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
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

  let users: UserRegistrationProps[] = [];
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
      <PageStats stats={userRegistrationStats} data={statsData} columns={4} />
      <DataTable
        data={users}
        meta={meta}
        columns={tableUserCollumns}
        responseError={userRegistrationResponseError}
        toolbar={createElement(UserToolbar)}
      />
    </>
  );
};

export { UserRegistrationContent };
