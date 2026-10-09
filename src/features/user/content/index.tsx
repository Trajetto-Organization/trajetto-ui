import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import { scopedBusinessId, type AdminScope } from "../lib/scope";
import type { UserListSearchMeta } from "../lib/user-rules";
import { userListQuery } from "../server-table";
import type { UserListMeta, UserRow } from "../types";

import { UserPageActions } from "../page-actions";
import { UserStats } from "../stats";
import { UsersTable } from "../table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface UserContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  scope: AdminScope;
  searchParams: PageSearchParams;
  token: string;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The user screen, one implementation for /admin and /dashboard
 * (decision 8.7). On /admin nothing is fetched until a company is picked in
 * the selector at the top; on /dashboard the API pins the list to the
 * session's company.
 */
const UserContent = async ({
  scope,
  searchParams,
  token,
}: UserContentProps): Promise<JSX.Element> => {
  const page = Number(first(searchParams.page)) || 1;
  const pageSize = Number(first(searchParams.pageSize)) || 10;
  const search = first(searchParams.search) || "";

  // The session's company is the API's business on /dashboard; only the
  // master's pick travels in the URL.
  const businessId = scopedBusinessId(
    scope,
    first(searchParams.businessId),
    undefined,
  );

  const header = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        scope === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <UserPageActions scope={scope} /> : undefined}
    />
  );

  if (scope === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {header(false)}

        <SelectBusinessEmptyState
          icon={UsersRound}
          description="Os usuários são cadastrados por empresa: escolha a operação acima para ver, criar e editar os dela."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };

  let rows: UserRow[] = [];
  let meta: UserListMeta = { total: 0, page, pageSize };
  let searchMeta: UserListSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    // Only the master's pick travels; the API pins everyone else anyway.
    ...(scope === "admin" && businessId && { businessId }),
    ...userListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/user/list-user?${query.toString()}`,
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
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de usuários cadastrados.",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    // A 403 says which refusal it is (decision 4.1): no permission, module
    // or inactive company, each with its own state instead of a table error.
    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          {header(false)}

          <AccessErrorState
            kind={refusal.kind}
            audience={scope === "admin" ? "master" : "company"}
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
          "Houve um erro ao tentar recuperar a lista de usuários cadastrados.",
      };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      rows = data as UserRow[];
      meta = metaParsed ?? { total: rows.length, page, pageSize };
      searchMeta = metaParsed?.searchMeta;
    }
  }

  return (
    // Keyed by company: switching it on /admin restarts the table's local
    // state instead of carrying the previous company's selection over.
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {header(true)}

      <UserStats searchMeta={searchMeta} listTotal={meta.total} />

      <UsersTable
        scope={scope}
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { UserContent };
