import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableServiceOrderCollumns } from "@/app/(protected)/_components/admin/service-order/table-service-order-collumns";

import type { ServiceOrderProps } from "@/app/(protected)/_components/admin/service-order/service-order.types";
import { ServiceOrderToolbar } from "@/app/(protected)/_components/admin/service-order/service-order-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { serviceOrderStats } from "./stats-config";
import { ServiceOrderActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ServiceOrderContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const ServiceOrderContent = async ({
  searchParams,
  token,
}: ServiceOrderContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let serviceOrderResponseError = {
    error: false,
    errorMessage: "",
  };

  let serviceOrder: ServiceOrderProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/service-order/list-service-order?page=${page}&pageSize=${pageSize}&search=${search}`,
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
            "create-service-order",
            "delete-service-order",
            "update-service-order",
          ],
        },
      },
    );
  } catch (error) {
    serviceOrderResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de ordens de serviço",
    };

    serviceOrder = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      serviceOrderResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de ordens de serviço",
      };

      serviceOrder = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      serviceOrder = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalServiceOrders: meta.total,
    completedOrders: serviceOrder.filter(
      (so) => so.completion_date !== null && so.completion_date !== undefined,
    ).length,
    pendingOrders: serviceOrder.filter(
      (so) => so.completion_date === null || so.completion_date === undefined,
    ).length,
    totalAmount: serviceOrder
      .reduce((sum, so) => {
        // Handle both number and string types for compatibility
        let amount: number = 0;

        if (typeof so.total_amount === "string") {
          // Remove formatting: "R$ 1,500.00" -> "1500.00"
          const cleanValue = (so.total_amount as string)
            .replace(/[^\d,.-]/g, "") // Remove R$, spaces, etc.
            .replace(/\./g, "") // Remove thousands separators
            .replace(",", "."); // Replace decimal point with period
          amount = parseFloat(cleanValue);
        } else if (typeof so.total_amount === "number") {
          // Already a number, use directly
          amount = so.total_amount;
        }

        return sum + (isNaN(amount) ? 0 : amount);
      }, 0)
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
  };

  return (
    <>
      <ServiceOrderActions hasData={serviceOrder.length > 0} />
      <PageStats stats={serviceOrderStats} data={statsData} columns={4} />
      <DataTable
        data={serviceOrder}
        meta={meta}
        columns={tableServiceOrderCollumns}
        responseError={serviceOrderResponseError}
        toolbar={createElement(ServiceOrderToolbar)}
      />
    </>
  );
};

export { ServiceOrderContent };
