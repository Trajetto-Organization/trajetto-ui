import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableQuoteColumns } from "@/app/(protected)/_components/admin/quote/table-quote-columns";

import type { QuoteProps } from "@/app/(protected)/_components/admin/quote/quote.types";
import { QuoteToolbar } from "@/app/(protected)/_components/admin/quote/quote-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { quoteStats } from "./stats-config";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface QuoteContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const QuoteContent = async ({
  searchParams,
  token,
}: QuoteContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let quoteResponseError = {
    error: false,
    errorMessage: "",
  };

  let quotes: QuoteProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/quote/list-quote?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-quote", "delete-quote", "update-quote-status"],
        },
      },
    );
  } catch (error) {
    quoteResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de orçamentos",
    };

    quotes = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      quoteResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de orçamentos",
      };

      quotes = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      quotes = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalQuotes: meta.total,
    pendingQuotes: quotes.filter((q) => q.status === "PENDING").length,
    contactedQuotes: quotes.filter((q) => q.status === "CONTACTED").length,
    convertedQuotes: quotes.filter((q) => q.status === "CONVERTED").length,
  };

  return (
    <>
      <PageStats stats={quoteStats} data={statsData} columns={4} />
      <DataTable
        data={quotes}
        meta={meta}
        columns={tableQuoteColumns}
        responseError={quoteResponseError}
        toolbar={createElement(QuoteToolbar)}
      />
    </>
  );
};

export { QuoteContent };
