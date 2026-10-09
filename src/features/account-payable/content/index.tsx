import { Receipt } from "lucide-react";
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
} from "@/features/supplier/lib/scope";

import {
  accountPayableListQuery,
  type AccountPayableRow,
  type AccountPayableSearchMeta,
} from "../lib/server-table";

import { AccountPayablePageActions } from "../page-actions";
import { AccountPayableStats } from "../stats";
import { AccountPayableTable } from "../table";

interface AccountPayableContentProps {
  mode: FinanceScope;
  searchParams: PageSearchParams;
  token: string;
}

/**
 * Contas a pagar, one screen for /admin and /dashboard (decision 8.7).
 *
 * What changed from the two copies: the MASTER picks the company at the top
 * (the admin list mixed every company); the status of each bill, the cards,
 * the filters and the order are the API's, over the whole company and by
 * its business day (decisions 8.4 and 8.8) — the screen no longer computes
 * a status, in five places, from the browser's clock.
 */
const AccountPayableContent = async ({
  mode,
  searchParams,
  token,
}: AccountPayableContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  const businessId =
    mode === "admin"
      ? scopedBusinessId(mode, firstParam(searchParams.businessId), null)
      : undefined;

  const renderHeader = (actions?: JSX.Element) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={actions}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader()}

        <SelectBusinessEmptyState
          icon={Receipt}
          description="As contas a pagar da empresa escolhida, com a situação de cada uma pelo calendário dela, aparecem aqui."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: AccountPayableRow[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: AccountPayableSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...businessIdQuery(mode, businessId),
    ...accountPayableListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/account-payable/list-account-payable?${query.toString()}`,
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
            "create-account-payable",
            "delete-account-payable",
            "update-account-payable",
          ],
        },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de contas a pagar",
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
          {renderHeader()}

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
          "Houve um erro ao tentar recuperar a lista de contas a pagar",
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
      {renderHeader(
        <AccountPayablePageActions scope={mode} hasData={meta.total > 0} />,
      )}

      <AccountPayableStats searchMeta={searchMeta} />

      <AccountPayableTable
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { AccountPayableContent };
