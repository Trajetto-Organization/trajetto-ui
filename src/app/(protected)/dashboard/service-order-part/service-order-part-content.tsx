import { createElement } from "react";

import { redirect } from "next/navigation";
import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { DashboardServiceOrderPartToolbar } from "@/app/(protected)/_components/dashboard/dashboard-service-order-part/dashboard-service-order-part-toolbar";
import { dashboardTableServiceOrderPartCollumns } from "@/app/(protected)/_components/dashboard/dashboard-service-order-part/dashboard-table-service-order-part-collumns";

import type { DashboardServiceOrderPartProps } from "@/app/(protected)/_components/dashboard/dashboard-service-order-part/dashboard-service-order-part.types";
import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import { parseNDJSON } from "@/lib/parse-nd-json";

import { serviceOrderPartStats } from "./stats-config";
import { ServiceOrderPartActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ServiceOrderPartContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const ServiceOrderPartContent = async ({
  searchParams,
  token,
}: ServiceOrderPartContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let serviceOrderPartResponseError = {
    error: false,
    errorMessage: "",
  };

  let serviceOrderPart: DashboardServiceOrderPartProps[] = [];
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      serviceOrderPart = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalItems: meta.total,
    withDiscount: serviceOrderPart.filter(
      (sop) => Number(sop.discount_percentage || 0) > 0,
    ).length,
    totalValue: serviceOrderPart
      .reduce((sum, sop) => {
        const unitPrice = Number(sop.unit_price);
        const quantity = sop.quantity;

        const discountPercentage = Number(sop.discount_percentage || 0);
        const totalPrice = unitPrice * quantity;

        const discountAmount = totalPrice * (discountPercentage / 100);
        const totalWithDiscount = totalPrice - discountAmount;

        return sum + totalWithDiscount;
      }, 0)
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    averageValue: (() => {
      if (serviceOrderPart.length === 0) return "R$ 0,00";

      const total = serviceOrderPart.reduce((sum, sop) => {
        const unitPrice = Number(sop.unit_price);
        const quantity = sop.quantity;

        const discountPercentage = Number(sop.discount_percentage || 0);
        const totalPrice = unitPrice * quantity;

        const discountAmount = totalPrice * (discountPercentage / 100);
        const totalWithDiscount = totalPrice - discountAmount;

        return sum + totalWithDiscount;
      }, 0);

      const average = total / serviceOrderPart.length;
      return average.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    })(),
  };

  return (
    <>
      <ServiceOrderPartActions />
      <PageStats stats={serviceOrderPartStats} data={statsData} columns={4} />

      <DataTable
        data={serviceOrderPart}
        meta={meta}
        columns={dashboardTableServiceOrderPartCollumns}
        responseError={serviceOrderPartResponseError}
        toolbar={createElement(DashboardServiceOrderPartToolbar)}
      />
    </>
  );
};

export { ServiceOrderPartContent };
