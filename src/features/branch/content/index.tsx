import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";
import {
  completeReadQuery,
  readCompleteList,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";

import {
  businessIdQuery,
  firstParam,
  scopedBusinessId,
  type BranchScope,
  type PageSearchParams,
} from "../lib/scope";
import {
  BRANCH_TABLE,
  branchListQuery,
  type BranchRow,
  type BranchSearchMeta,
} from "../lib/server-table";
import { BRANCH_LOCAL } from "../lib/local-table";
import { BRANCH_LIST_TAGS } from "../lib/list-tags";

import { BranchPageActions } from "../page-actions";

import { BranchListSection } from "./list-section";

interface BranchContentProps {
  mode: BranchScope;
  searchParams: PageSearchParams;
  token: string;
}

interface BranchListRead {
  rows: BranchRow[];
  meta: { total: number; page: number; pageSize: number };
  searchMeta?: BranchSearchMeta;
  responseError: { error: boolean; errorMessage: string };
  /** The API's named refusal (permission, tenant, inactive company). */
  refusal: AccessError | null;
  unauthorized: boolean;
}

/** One request to the branch list, with the page the query names. */
async function readBranchList(
  query: Record<string, string>,
  token: string,
): Promise<BranchListRead> {
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);

  const read: BranchListRead = {
    rows: [],
    meta: { total: 0, page, pageSize },
    responseError: { error: false, errorMessage: "" },
    refusal: null,
    unauthorized: false,
  };

  let response: Response;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/branch/list-branch?${new URLSearchParams(query).toString()}`,
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
    read.responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de filiais",
    };

    return read;
  }

  if (response.status === 401) {
    read.unauthorized = true;

    return read;
  }

  // A 403 says which refusal it is (decision 4.1): permission, tenant or
  // an inactive company — never a blank table.
  read.refusal = await readAccessError(response);

  if (read.refusal) return read;

  if (!response.ok) {
    read.responseError = {
      error: true,
      errorMessage: "Houve um erro ao tentar recuperar a lista de filiais",
    };

    return read;
  }

  const { meta, data } = await parseNDJSON(response);

  read.rows = data;
  read.meta = meta ?? { total: data.length, page, pageSize };
  read.searchMeta = meta?.searchMeta;

  return read;
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

  // The company's whole set when the search fits in one read: the browser
  // then answers the status and UF filters, the date sorts and the pages
  // (spec §13). Otherwise the server's page, as before.
  const read = await readCompleteList({
    source: searchParams,
    spec: BRANCH_TABLE,
    local: BRANCH_LOCAL,
    read: ({ complete }) =>
      readBranchList(
        {
          ...(complete
            ? completeReadQuery(searchParams, BRANCH_TABLE)
            : {
                page: String(page),
                pageSize: String(pageSize),
                ...branchListQuery(searchParams),
              }),
          search,
          ...businessIdQuery(mode, businessId),
        },
        token,
      ),
    isOk: (answer) =>
      !answer.unauthorized && !answer.refusal && !answer.responseError.error,
  });

  if (read.unauthorized) redirect("/login");

  if (read.refusal) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader(false)}

        <AccessErrorState
          kind={read.refusal.kind}
          audience={mode === "admin" ? "master" : "company"}
          message={read.refusal.message}
        />
      </div>
    );
  }

  return (
    // key: switching company on /admin restarts the screen, so the list
    // query, its search box and any rows answered in the browser start over
    // with the new company (decision 2.6, spec §13).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true)}

      <BranchListSection
        mode={mode}
        data={read.rows}
        meta={read.meta}
        responseError={read.responseError}
        searchMeta={read.searchMeta}
        complete={read.complete}
      />
    </div>
  );
};

export { BranchContent };
