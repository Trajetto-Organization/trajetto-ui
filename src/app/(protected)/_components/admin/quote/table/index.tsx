"use client";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { QuoteToolbar } from "../quote-toolbar";
import { QUOTE_TABLE, type QuoteSearchMeta } from "../lib/server-table";
import { tableQuoteColumns } from "../table-quote-columns";
import type { QuoteProps } from "../quote.types";

interface QuoteTableProps {
  data: QuoteProps[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: QuoteSearchMeta;
}

/**
 * Quotes on the server-side table contract: order, the stage and fleet-size
 * filters and the pager answered by the API over every quote.
 */
const QuoteTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: QuoteTableProps): JSX.Element => (
  <DataTable
    data={data}
    meta={meta}
    columns={tableQuoteColumns}
    responseError={responseError}
    server={QUOTE_TABLE}
    toolbar={<QuoteToolbar facets={searchMeta?.facets} />}
  />
);

export { QuoteTable };
