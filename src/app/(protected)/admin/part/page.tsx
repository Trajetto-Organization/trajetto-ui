import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { tablePartCollumns } from "../../_components/admin/part/table-part-collumns";

import { PartProps } from "../../_components/admin/part/dto";
import { PartToolbar } from "../../_components/admin/part/part-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface PartQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Peças",
    description: `
      Otimize a gestão completa do inventário de peças da sua frota. 
      Cadastre, rastreie e monitore todas as peças e componentes automotivos, 
      controle níveis de estoque, acompanhe custos unitários, 
      planeje manutenções preventivas e reduza tempo de inatividade dos veículos 
      com nossa plataforma integrada de gestão de peças. 
      Maximize a vida útil da sua frota com manutenção eficiente.`,
  };
}

const Part = async ({
  searchParams,
}: PartQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let partResponseError = {
    error: false,
    errorMessage: "",
  };

  let part: PartProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/part/list-part?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-part", "delete-part", "update-part"],
        },
      },
    );
  } catch (error) {
    partResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de peças",
    };

    part = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      partResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de peças",
      };

      part = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      part = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Peças"}
        description="Cadastre, monitore preços e gerencie todas as peças necessárias para manutenção eficiente da sua frota."
      />

      <DataTable
        data={part}
        meta={meta}
        columns={tablePartCollumns}
        responseError={partResponseError}
        toolbar={createElement(PartToolbar)}
      />
    </PageContainer>
  );
};

export default Part;
