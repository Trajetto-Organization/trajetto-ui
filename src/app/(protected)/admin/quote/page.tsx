import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { tableQuoteColumns } from "../../_components/admin/quote/table-quote-columns";

import { QuoteProps } from "../../_components/admin/quote/dto";
import { QuoteToolbar } from "../../_components/admin/quote/quote-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface QuoteQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Orçamentos",
    description: `
      Gerencie todas as solicitações de orçamento recebidas. 
      Acompanhe o status de cada lead, registre contatos realizados, 
      adicione notas sobre negociações e converta prospects em clientes. 
      Otimize seu processo de vendas com visibilidade completa do funil comercial.`,
  };
}

const Quote = async ({
  searchParams,
}: QuoteQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

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
          Authorization: `Bearer ${tokenAccess}`,
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

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Orçamentos"}
        description="Gerencie todas as solicitações de orçamento e acompanhe o processo de vendas."
      />

      <DataTable
        data={quotes}
        meta={meta}
        columns={tableQuoteColumns}
        responseError={quoteResponseError}
        toolbar={createElement(QuoteToolbar)}
      />
    </PageContainer>
  );
};

export default Quote;
