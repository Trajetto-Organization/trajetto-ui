import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { getCookies } from "@/actions/cookies";

import { dashboardTableUserCollumns } from "../../_components/dashboard/dashboard-user/dashboard-user-collumns";
import { DashboardUserToolbar } from "../../_components/dashboard/dashboard-user/dashboard-user-toolbar";

import { DashboardUserRegistrationProps } from "../../_components/dashboard/dashboard-user/dto";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { userRegistrationStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { UserRegistrationActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
  search?: string;
}

interface UserRegistrationQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cadastro de usuário",
    description: `
      Gerencie o cadastro de usuários de forma eficiente. Adicione, edite e 
      visualize usuários registrados no sistema com segurança e controle total.`,
  };
}

const UserRegistration = async ({
  searchParams,
}: UserRegistrationQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

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
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
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
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      users = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalUsers: meta.total,
    activeUsers: users.filter((user) => user.access_revoked === false).length,
    twoFactorEnabled: users.filter((user) => user.two_factor_enabled === true)
      .length,
    emailVerified: users.filter((user) => user.email_verified === true).length,
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Cadastro de usuário"}
        description="Gerencie o cadastro de usuários de forma simples e segura"
      />

      <UserRegistrationActions />
      <PageStats stats={userRegistrationStats} data={statsData} columns={4} />

      <DataTable
        data={users}
        meta={meta}
        columns={dashboardTableUserCollumns}
        responseError={userRegistrationResponseError}
        toolbar={createElement(DashboardUserToolbar)}
      />
    </PageContainer>
  );
};

export default UserRegistration;
