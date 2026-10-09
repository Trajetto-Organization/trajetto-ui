import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import { scopedBusinessId, type AdminScope } from "@/features/user/lib/scope";

import type { PermissionListSearchMeta } from "../lib/permission-rules";
import { permissionListQuery } from "../server-table";
import type { PermissionListMeta, PermissionRow } from "../types";

import { PermissionPageActions } from "../page-actions";
import { PermissionStats } from "../stats";
import { PermissionsTable } from "../table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface PermissionContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  scope: AdminScope;
  searchParams: PageSearchParams;
  token: string;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The permission screen, one implementation for /admin and /dashboard
 * (decision 8.7). The /admin copy listed every company's permissions mixed
 * in one table; it now asks for the company picked at the top. Cards,
 * filters and order are the server's, over the whole company (8.8).
 */
const PermissionContent = async ({
  scope,
  searchParams,
  token,
}: PermissionContentProps): Promise<JSX.Element> => {
  const page = Number(first(searchParams.page)) || 1;
  const pageSize = Number(first(searchParams.pageSize)) || 10;
  const search = first(searchParams.search) || "";

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
      actions={
        withActions ? <PermissionPageActions scope={scope} /> : undefined
      }
    />
  );

  if (scope === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {header(false)}

        <SelectBusinessEmptyState
          icon={KeyRound}
          description="As permissões são dos perfis de cada empresa: escolha a operação acima para ver e ajustar as dela."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: PermissionRow[] = [];
  let meta: PermissionListMeta = { total: 0, page, pageSize };
  let searchMeta: PermissionListSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    // Only the master's pick travels; the API pins everyone else anyway.
    ...(scope === "admin" && businessId && { businessId }),
    ...permissionListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/permission/list-permission?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-permission", "update-permission", "delete-permission"],
        },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de permissões.",
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
          "Houve um erro ao tentar recuperar a lista de permissões.",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data as PermissionRow[];
      meta = parsedMeta ?? { total: rows.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
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

      <PermissionStats searchMeta={searchMeta} />

      <PermissionsTable
        scope={scope}
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { PermissionContent };
