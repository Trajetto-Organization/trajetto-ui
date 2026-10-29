import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import {
  businessIdQuery,
  firstParam,
  scopedBusinessId,
  type FinanceScope,
  type PageSearchParams,
} from "../lib/scope";
import {
  supplierListQuery,
  type SupplierRow,
  type SupplierSearchMeta,
} from "../lib/server-table";

import { SupplierPageActions } from "../page-actions";
import { SupplierStats } from "../stats";
import { SupplierTable } from "../table";

interface SupplierContentProps {
  mode: FinanceScope;
  searchParams: PageSearchParams;
  token: string;
}

/**
 * Fornecedores, one screen for /admin and /dashboard (decision 8.7).
 *
 * The admin copy listed every company's suppliers mixed in one table and its
 * cards counted the ten rows on screen; now the MASTER picks the company at
 * the top, and cards, the UF filter and the order are the server's over that
 * company (decision 8.8).
 */
const SupplierContent = async ({
  mode,
  searchParams,
  token,
}: SupplierContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  const businessId =
    mode === "admin"
      ? scopedBusinessId(mode, firstParam(searchParams.businessId), null)
      : undefined;

  const renderHeader = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <SupplierPageActions scope={mode} /> : undefined}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={Building2}
          description="As oficinas, lojas e prestadores da empresa escolhida aparecem aqui."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: SupplierRow[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: SupplierSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...businessIdQuery(mode, businessId),
    ...supplierListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/supplier/list-supplier?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-supplier", "delete-supplier", "update-supplier"],
        },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de fornecedores",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    // A 403 says which refusal it is (decision 4.1): module, permission or
    // an inactive company — never a blank table.
    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          {renderHeader(false)}

          <AccessErrorState
            kind={refusal.kind}
            moduleLabel="Gestão de Frota"
            audience={mode === "admin" ? "master" : "company"}
            message={refusal.message}
            action={
              // The MASTER's way out of "módulo não contratado" (4.3).
              refusal.kind === "module-not-enabled" &&
              mode === "admin" &&
              businessId ? (
                <ManageModulesButton businessId={businessId} />
              ) : undefined
            }
          />
        </div>
      );
    }

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de fornecedores",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data;
      meta = parsedMeta ?? { total: data.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
    }
  }

  return (
    // key: switching company restarts the screen's local state (2.6).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true)}

      <SupplierStats searchMeta={searchMeta} />

      <SupplierTable
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { SupplierContent };
