import { redirect } from "next/navigation";
import { FileWarning } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

import { fineListQuery, type PageSearchParams } from "../lib/server-table";
import { resolveFineBusinessId } from "../lib/scope";
import type { FineListSearchMeta, FineRow, FineScreenMode } from "../lib/types";

import { FinePageActions } from "../page-actions";
import { FineStats } from "../stats";
import { FineTable } from "../table";

interface FineContentProps {
  /** "admin": the MASTER picks the company above; "dashboard": the session's. */
  mode: FineScreenMode;
  searchParams: PageSearchParams;
  token: string;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The fines screen, one implementation for /admin and /dashboard (decision
 * 8.7): the two copies had drifted (the /admin one listed every company's
 * fines mixed together, with a company filter over the loaded page, and
 * neither checked permissions the same way).
 *
 * The company band, the actions, the cards from the server, and the table
 * on the server-side contract. On /admin nothing is fetched until a company
 * is picked: there is no "all companies" list of fines.
 */
const FineContent = async ({
  mode,
  searchParams,
  token,
}: FineContentProps): Promise<JSX.Element> => {
  const page = Number(first(searchParams.page)) || 1;
  const pageSize = Number(first(searchParams.pageSize)) || 10;
  const search = first(searchParams.search) || "";

  // The session's company is not known on the server here; the API pins
  // every non-MASTER to it, so /dashboard sends none.
  const businessId =
    mode === "admin"
      ? resolveFineBusinessId(mode, first(searchParams.businessId), null)
      : undefined;

  const renderHeader = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? (
          <FinePageActions mode={mode} hasData={hasData} />
        ) : undefined
      }
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={FileWarning}
          description="As multas da empresa escolhida aparecem aqui, com a situação de pagamento, os totais e os filtros."
        />
      </div>
    );
  }

  const renderAccessError = (error: AccessError) => (
    <div className="my-6 space-y-6">
      {renderHeader(false)}

      <AccessErrorState
        kind={error.kind}
        moduleLabel="Gestão de Frota"
        audience={mode === "admin" ? "master" : "company"}
        message={error.message}
        action={
          error.kind === "module-not-enabled" &&
          mode === "admin" &&
          businessId ? (
            <ManageModulesButton businessId={businessId} />
          ) : undefined
        }
      />
    </div>
  );

  let responseError = { error: false, errorMessage: "" };
  let rows: FineRow[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: FineListSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...(businessId && { businessId }),
    ...fineListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fines/list-fine?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: ["update-fine"] },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de multas",
    };
  }

  if (response) {
    if (response.status === 401) {
      redirect("/login");
    }

    // A refusal said as what it is (decision 4.1): only MODULE_NOT_ENABLED
    // is the module state.
    const refusal = await readAccessError(response);

    if (refusal) {
      return renderAccessError(refusal);
    }

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de multas",
      };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      rows = data as FineRow[];
      meta = metaParsed ?? { total: rows.length, page, pageSize };
      searchMeta = metaParsed?.searchMeta;
    }
  }

  return (
    // key: switching company restarts the screen's local state (decision 2.6).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true, rows.length > 0)}

      <FineStats searchMeta={searchMeta} />

      <FineTable
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { FineContent };
