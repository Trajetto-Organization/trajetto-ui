import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";
import { DashboardProfileAccessProps } from "../../_components/dashboard/dashboard-profile-access/dto";

import { dashboardTableProfileAccessCollumns } from "../../_components/dashboard/dashboard-profile-access/dashboard-table-profile-access-collumns";
import { DashboardProfileAccessToolbar } from "../../_components/dashboard/dashboard-profile-access/dashboard-profile-access-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { DataTable } from "../../_components/tanstack-table/data-table";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ProfileAccessQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Perfil de Acesso",
    description: `
    Página para gerenciamento dos perfis de acesso: visualize, edite e 
    crie funções para usuários, garantindo segurança e eficiência.`,
  };
}

const ProfileAccess = async ({
  searchParams,
}: ProfileAccessQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let profileAccessResponseError = {
    error: false,
    errorMessage: "",
  };

  let profileAccess: DashboardProfileAccessProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/profile-access/list-profile-access?page=${page}&pageSize=${pageSize}&search=${search}`,
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
            "create-profile-access",
            "update-profile-access",
            "delete-profile-access",
          ],
        },
      },
    );
  } catch (error) {
    profileAccessResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de perfis de acesso",
    };

    profileAccess = [];
    meta = { total: 0, page: 1, pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      profileAccessResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de perfis de acesso",
      };

      profileAccess = [];
      meta = { total: 0, page: 1, pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      profileAccess = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Perfil de acesso"}
        description="Gerencie os perfis de acesso do sistema, 
        definindo funções e permissões de forma prática e segura."
      />
      <DataTable
        data={profileAccess}
        meta={meta}
        columns={dashboardTableProfileAccessCollumns}
        responseError={profileAccessResponseError}
        toolbar={createElement(DashboardProfileAccessToolbar)}
      />
    </PageContainer>
  );
};

export default ProfileAccess;
