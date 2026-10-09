import { redirect } from "next/navigation";

import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import type { QuoteProps } from "@/app/(protected)/_components/admin/quote/quote.types";
import { QuoteStats } from "@/app/(protected)/_components/admin/quote/stats";
import { QuoteTable } from "@/app/(protected)/_components/admin/quote/table";
import {
  quoteListQuery,
  type PageSearchParams,
  type QuoteSearchMeta,
} from "@/app/(protected)/_components/admin/quote/lib/server-table";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import { QuoteActions } from "./page-actions";

interface QuoteContentProps {
  searchParams: PageSearchParams;
  token: string;
}

/** The RSC tags the list is fetched with; the write actions revalidate them. */
const QUOTE_LIST_TAGS = ["create-quote", "delete-quote", "update-quote-status"];

const firstParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * Orçamentos (/admin). The per-stage cards, the stage and fleet-size filters
 * and the order are the API's over every quote (decision 8.8): the old
 * screen counted "Pendentes", "Contatados" and "Convertidos" on the ten rows
 * of the page.
 */
const QuoteContent = async ({
  searchParams,
  token,
}: QuoteContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  let responseError = { error: false, errorMessage: "" };
  let quotes: QuoteProps[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: QuoteSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...quoteListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/quote/list-quote?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: QUOTE_LIST_TAGS },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de orçamentos",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    // A 403 says which refusal it is (decision 4.1), never a generic error.
    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          <ProtectedPageToolbar />

          <AccessErrorState
            kind={refusal.kind}
            audience="master"
            message={refusal.message}
          />
        </div>
      );
    }

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de orçamentos",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      quotes = data;
      meta = parsedMeta ?? { total: data.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
    }
  }

  return (
    <div className="my-6 space-y-6">
      <ProtectedPageToolbar actions={<QuoteActions />} />

      <QuoteStats searchMeta={searchMeta} />

      <QuoteTable
        data={quotes}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { QuoteContent };
