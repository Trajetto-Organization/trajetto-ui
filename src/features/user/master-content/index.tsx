import { redirect } from "next/navigation";

import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import type { UserListSearchMeta } from "../lib/user-rules";
import { masterUserListQuery } from "../server-table";
import type { UserListMeta, UserRow } from "../types";

import { MasterUserPageActions } from "../master-page-actions";
import { UserStats } from "../stats";
import { MasterUsersTable } from "../table/master-table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface MasterUserContentProps {
  searchParams: PageSearchParams;
  token: string;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The platform's masters, on the same building blocks as the company user
 * screen (decision 8.7): cards and filters counted by the server over every
 * master but the one asking, never over the page (8.8), and no password in
 * any dialog (4.9).
 */
const MasterUserContent = async ({
  searchParams,
  token,
}: MasterUserContentProps): Promise<JSX.Element> => {
  const page = Number(first(searchParams.page)) || 1;
  const pageSize = Number(first(searchParams.pageSize)) || 10;
  const search = first(searchParams.search) || "";

  const header = (withActions: boolean) => (
    <ProtectedPageToolbar
      actions={withActions ? <MasterUserPageActions /> : undefined}
    />
  );

  let responseError = { error: false, errorMessage: "" };
  let rows: UserRow[] = [];
  let meta: UserListMeta = { total: 0, page, pageSize };
  let searchMeta: UserListSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...masterUserListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/user/list-master-users?${query.toString()}`,
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
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de usuários master.",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          {header(false)}

          <AccessErrorState
            kind={refusal.kind}
            audience="master"
            message={refusal.message}
          />
        </div>
      );
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      responseError = {
        error: true,
        errorMessage:
          body?.message ??
          "Houve um erro ao tentar recuperar a lista de usuários master.",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data as UserRow[];
      meta = parsedMeta ?? { total: rows.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
    }
  }

  return (
    <div className="my-6 space-y-6" data-tutorial="welcome">
      {header(true)}

      <UserStats
        variant="masters"
        searchMeta={searchMeta}
        listTotal={meta.total}
      />

      <MasterUsersTable
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { MasterUserContent };
