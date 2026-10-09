import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import { scopedBusinessId, type AdminScope } from "@/features/user/lib/scope";

import { profileAccessListQuery } from "../server-table";
import type { ProfileAccessListMeta, ProfileAccessRow } from "../types";

import { ProfileAccessPageActions } from "../page-actions";
import { ProfileAccessStats } from "../stats";
import { ProfileAccessTable } from "../table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface ProfileAccessContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  scope: AdminScope;
  searchParams: PageSearchParams;
  token: string;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The access-profile screen, one implementation for /admin and /dashboard
 * (decision 8.7). The /admin copy listed every company's profiles mixed in
 * one table, filtered by company among the ten rows on screen; it now asks
 * for the company picked at the top, like every back-office list.
 */
const ProfileAccessContent = async ({
  scope,
  searchParams,
  token,
}: ProfileAccessContentProps): Promise<JSX.Element> => {
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
        withActions ? <ProfileAccessPageActions scope={scope} /> : undefined
      }
    />
  );

  if (scope === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {header(false)}

        <SelectBusinessEmptyState
          icon={ShieldCheck}
          description="Os perfis de acesso são de cada empresa: escolha a operação acima para ver, criar e configurar os dela."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: ProfileAccessRow[] = [];
  let meta: ProfileAccessListMeta = { total: 0, page, pageSize };

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    // Only the master's pick travels; the API pins everyone else anyway.
    ...(scope === "admin" && businessId && { businessId }),
    ...profileAccessListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/profile-access/list-profile-access?${query.toString()}`,
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
            // The row counts the profile's permissions: configuring them in
            // bulk (which revalidates update-permission) or on the Permissões
            // screen changes the column.
            "create-permission",
            "update-permission",
            "delete-permission",
          ],
        },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de perfis de acesso.",
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
          "Houve um erro ao tentar recuperar a lista de perfis de acesso.",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data as ProfileAccessRow[];
      meta = parsedMeta ?? { total: rows.length, page, pageSize };
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

      {/* The cards count the company's whole search (the API's searchMeta). */}
      <ProfileAccessStats
        searchMeta={meta.searchMeta}
        total={responseError.error ? undefined : meta.total}
      />

      <ProfileAccessTable
        scope={scope}
        data={rows}
        meta={meta}
        responseError={responseError}
      />
    </div>
  );
};

export { ProfileAccessContent };
