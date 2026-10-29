import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

import {
  scopedDriverBusinessId,
  type DriverListSearchMeta,
  type DriverScope,
} from "../lib/driver-rules";
import { driverListQuery } from "../server-table";
import type { DriverListMeta, DriverRow } from "../types";

import { DriverPageActions } from "../page-actions";
import { DriverStats } from "../stats";
import { DriversTable } from "../table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface DriverContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: DriverScope;
  searchParams: PageSearchParams;
  token: string;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The driver screen, one implementation for /admin and /dashboard
 * (decision 8.7). What differs is where the company comes from: the selector
 * at the top on /admin — nothing is fetched until one is picked — and the
 * session on /dashboard, where the API pins the list to it anyway.
 */
const DriverContent = async ({
  mode,
  searchParams,
  token,
}: DriverContentProps): Promise<JSX.Element> => {
  const page = Number(first(searchParams.page)) || 1;
  const pageSize = Number(first(searchParams.pageSize)) || 10;
  const search = first(searchParams.search) || "";

  // The session's company is the API's business on /dashboard; only the
  // master's pick travels in the URL.
  const businessId = scopedDriverBusinessId(
    mode,
    first(searchParams.businessId),
    undefined,
  );

  const header = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? (
          <DriverPageActions mode={mode} hasData={hasData} />
        ) : undefined
      }
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-6 my-6">
        {header(false)}

        <SelectBusinessEmptyState
          icon={UserRound}
          description="Os motoristas são cadastrados por empresa: escolha a operação acima para ver, cadastrar e exportar os dela."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };

  let rows: DriverRow[] = [];
  let meta: DriverListMeta = { total: 0, page, pageSize };
  let searchMeta: DriverListSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...(businessId && { businessId }),
    ...driverListQuery(searchParams),
  });

  let response: Response | undefined;
  let accessError: AccessError | null = null;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/driver/list-driver?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: ["create-driver", "delete-driver", "update-driver"] },
      },
    );
  } catch (error) {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de motoristas",
    };
  }

  if (response) {
    // A 403 is told apart by its code (decision 4.1): a permission of this
    // user, or a company switched off. Drivers serve both modules, so the
    // module gate never answers here.
    accessError = await readAccessError(response);
  }

  if (accessError) {
    return (
      <div className="space-y-6 my-6">
        {header(false)}

        <AccessErrorState
          kind={accessError.kind}
          message={accessError.message}
          audience={mode === "admin" ? "master" : "company"}
        />
      </div>
    );
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      responseError = {
        error: true,
        errorMessage:
          body?.message ??
          "Houve um erro ao tentar recuperar a lista de motoristas",
      };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      rows = data as DriverRow[];
      meta = metaParsed ?? { total: rows.length, page, pageSize };
      searchMeta = metaParsed?.searchMeta;
    }
  }

  return (
    // Keyed by company: switching it on /admin restarts the table's local
    // state instead of carrying the previous company's selection over.
    <div
      key={businessId ?? "session"}
      className="space-y-6 my-6"
      data-tutorial="welcome"
    >
      {header(true, rows.length > 0)}

      <DriverStats searchMeta={searchMeta} />

      <DriversTable
        mode={mode}
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { DriverContent };
