import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";

import { ServiceOrderPartToolbar } from "../../_components/admin/service-order-part/service-order-part-toolbar";
import { tableServiceOrderPartCollumns } from "../../_components/admin/service-order-part/table-service-order-part-collumns";

import { ServiceOrderPartProps } from "../../_components/admin/service-order-part/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

import { serviceOrderPartStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { ServiceOrderPartActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ServiceOrderPartQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Ordem de serviço por peça",
    description: `
      Gerencie facilmente as ordens de serviço das peças cadastradas. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const ServiceOrderPart = async ({
  searchParams,
}: ServiceOrderPartQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let serviceOrderPartResponseError = {
    error: false,
    errorMessage: "",
  };

  let serviceOrderPart: ServiceOrderPartProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/service-order-part/list-service-order-part?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: [
            "create-service-order-part",
            "delete-service-order-part",
            "update-service-order-part",
          ],
        },
      },
    );
  } catch (error) {
    serviceOrderPartResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista das ordens de serviço por peça",
    };

    serviceOrderPart = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      serviceOrderPartResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista das ordens de serviço por peça",
      };

      serviceOrderPart = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      serviceOrderPart = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalItems: meta.total,
    withDiscount: serviceOrderPart.filter(
      (sop) => sop.discount_percentage !== "0%",
    ).length,
    totalValue: serviceOrderPart
      .reduce((sum, sop) => {
        const cleanValue = (sop.totalWithDiscount || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");
        const value = parseFloat(cleanValue);
        return sum + (isNaN(value) ? 0 : value);
      }, 0)
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    averageValue: (() => {
      if (serviceOrderPart.length === 0) return "R$ 0,00";
      const total = serviceOrderPart.reduce((sum, sop) => {
        const cleanValue = (sop.totalWithDiscount || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");
        const value = parseFloat(cleanValue);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      const average = total / serviceOrderPart.length;
      return average.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    })(),
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Ordem de serviço por peça"}
        description="Gerencie as ordens de serviços das peças cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <ServiceOrderPartActions />
      <PageStats stats={serviceOrderPartStats} data={statsData} columns={4} />

      <DataTable
        data={serviceOrderPart}
        meta={meta}
        columns={tableServiceOrderPartCollumns}
        responseError={serviceOrderPartResponseError}
        toolbar={createElement(ServiceOrderPartToolbar)}
      />
    </PageContainer>
  );
};

export default ServiceOrderPart;
