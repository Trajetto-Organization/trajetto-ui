import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import {
  businessIdQuery,
  firstParam,
  scopedBusinessId,
  type BranchScope,
  type PageSearchParams,
} from "../lib/scope";
import {
  branchListQuery,
  type BranchRow,
  type BranchSearchMeta,
} from "../lib/server-table";
import { BRANCH_LIST_TAGS } from "../lib/list-tags";

import { BranchPageActions } from "../page-actions";
import { BranchStats } from "../stats";
import { BranchTable } from "../table";

interface BranchContentProps {
  mode: BranchScope;
  searchParams: PageSearchParams;
  token: string;
}

/**
 * Filiais, one screen for /admin and /dashboard (decision 8.7).
 *
 * The admin copy listed every company's branches mixed in one table, with a
 * company column and filter, and its cards counted the ten rows on screen;
 * now the MASTER picks the company at the top, and cards, filters and the
 * order are the server's over that company (decision 8.8).
 */
const BranchContent = async ({
  mode,
  searchParams,
  token,
}: BranchContentProps): Promise<JSX.Element> => {
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
      actions={withActions ? <BranchPageActions scope={mode} /> : undefined}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={Building2}
          description="As filiais da empresa escolhida aparecem aqui, com os cartões e os filtros da empresa inteira."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: BranchRow[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: BranchSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...businessIdQuery(mode, businessId),
    ...branchListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/branch/list-branch?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: [...BRANCH_LIST_TAGS] },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de filiais",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    // A 403 says which refusal it is (decision 4.1): permission, tenant or
    // an inactive company — never a blank table.
    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          {renderHeader(false)}

          <AccessErrorState
            kind={refusal.kind}
            audience={mode === "admin" ? "master" : "company"}
            message={refusal.message}
          />
        </div>
      );
    }

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de filiais",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data;
      meta = parsedMeta ?? { total: data.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
    }
  }

  return (
    // key: switching company on /admin restarts the screen, so the toolbar's
    // uncontrolled search box does not keep the previous company's term
    // (decision 2.6).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true)}

      <BranchStats searchMeta={searchMeta} />

      <BranchTable
        mode={mode}
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { BranchContent };
