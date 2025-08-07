import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";

import { dashboardTablePermissionsCollumns } from "../../_components/dashboard/dashboard-permission/dashboard-table-permissions-collumns";
import { DashboardPermissionToolbar } from "../../_components/dashboard/dashboard-permission/dashboard-permission-toolbar";

import { DashboardPermissionProps } from "../../_components/dashboard/dashboard-permission/dto";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface PermissionQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Permissão de usuário",
    description: `
      Gerencie de forma segura e intuitiva as permissões de acesso dos usuários. 
      Visualize, crie e edite privilégios para manter o controle total do sistema.`,
  };
}

const Permission = async ({
  searchParams,
}: PermissionQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let permissionResponseError = {
    error: false,
    errorMessage: "",
  };

  let permission: DashboardPermissionProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/permission/list-permission?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-permission", "delete-permission", "update-permission"],
        },
      },
    );
  } catch (error) {
    permissionResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de permissões",
    };

    permission = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      permissionResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de permissões",
      };

      permission = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      permission = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Permissão de usuário"}
        description="Visualize e gerencie as permissões de acesso dos usuários do sistema."
      />

      <DataTable
        data={permission}
        meta={meta}
        columns={dashboardTablePermissionsCollumns}
        responseError={permissionResponseError}
        toolbar={createElement(DashboardPermissionToolbar)}
      />
    </PageContainer>
  );
};

export default Permission;
