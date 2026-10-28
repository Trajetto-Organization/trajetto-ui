"use client";

import { useCompleteList } from "@/app/(protected)/_components/shared/tanstack-table/data-table/use-complete-list";

import type { BranchScope } from "../lib/scope";
import {
  BRANCH_TABLE,
  type BranchRow,
  type BranchSearchMeta,
} from "../lib/server-table";
import { BRANCH_LOCAL, summarizeBranches } from "../lib/local-table";

import { BranchStats } from "../stats";
import { BranchTable } from "../table";

interface BranchListSectionProps {
  mode: BranchScope;
  data: BranchRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: BranchSearchMeta;
  /** The key of a complete read, absent for the server's page. */
  complete?: string;
}

/**
 * The cards and the table of Filiais over one list query (spec §13): when
 * the read brought the company's whole set, the status and UF filters, the
 * date and status sorts and the pages are answered here, and the cards count
 * the same selection; otherwise both show the server's answer.
 */
function BranchListSection({
  mode,
  data,
  meta,
  responseError,
  searchMeta,
  complete,
}: BranchListSectionProps): JSX.Element {
  const list = useCompleteList({
    rows: data,
    meta,
    searchMeta,
    complete,
    spec: BRANCH_TABLE,
    local: BRANCH_LOCAL,
    summarize: summarizeBranches,
  });

  return (
    <>
      <BranchStats searchMeta={list.searchMeta} />

      <BranchTable
        mode={mode}
        data={list.rows}
        meta={list.meta}
        responseError={responseError}
        searchMeta={list.searchMeta}
        listQuery={list.listQuery}
      />
    </>
  );
}

export { BranchListSection };
