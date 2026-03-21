import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableProfileAccessCollumns } from "@/app/(protected)/_components/admin/profile-access/table-profile-access-collumns";

import type { ProfileAccessProps } from "@/app/(protected)/_components/admin/profile-access/profile-access.types";
import { ProfileAccessToolbar } from "@/app/(protected)/_components/admin/profile-access/profile-access-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ProfileAccessContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const ProfileAccessContent = async ({
  searchParams,
  token,
}: ProfileAccessContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let profileAccessResponseError = {
    error: false,
    errorMessage: "",
  };

  let profileAccess: ProfileAccessProps[] = [];
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      profileAccess = data;
      meta = metaParsed;
    }
  }

  return (
    <>
      <DataTable
        data={profileAccess}
        meta={meta}
        columns={tableProfileAccessCollumns}
        responseError={profileAccessResponseError}
        toolbar={createElement(ProfileAccessToolbar)}
      />
    </>
  );
};

export { ProfileAccessContent };
