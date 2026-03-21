import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tablePermissionsCollumns } from "@/app/(protected)/_components/admin/permission/table-permissions-collumns";

import type { PermissionProps } from "@/app/(protected)/_components/admin/permission/permission.types";
import { PermissionToolbar } from "@/app/(protected)/_components/admin/permission/permission-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface PermissionContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const PermissionContent = async ({
  searchParams,
  token,
}: PermissionContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let permissionResponseError = {
    error: false,
    errorMessage: "",
  };

  let permission: PermissionProps[] = [];
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      permission = data;
      meta = metaParsed;
    }
  }

  return (
    <>
      <DataTable
        data={permission}
        meta={meta}
        columns={tablePermissionsCollumns}
        responseError={permissionResponseError}
        toolbar={createElement(PermissionToolbar)}
      />
    </>
  );
};

export { PermissionContent };
