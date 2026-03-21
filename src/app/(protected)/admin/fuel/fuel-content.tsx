import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableFuelColumns } from "@/app/(protected)/_components/admin/fuel/table-fuel-collumns";

import type { FuelProps } from "@/app/(protected)/_components/shared/common.types";
import { FuelToolbar } from "@/app/(protected)/_components/admin/fuel/fuel-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { fuelStats } from "./stats-config";
import { FuelActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FuelContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const FuelContent = async ({
  searchParams,
  token,
}: FuelContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let fuelResponseError = {
    error: false,
    errorMessage: "",
  };

  let fuel: FuelProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fuel/list-fuel?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-fuel", "delete-fuel", "update-fuel"],
        },
      },
    );
  } catch (error) {
    fuelResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de abastecimentos",
    };

    fuel = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      fuelResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de abastecimentos",
      };

      fuel = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fuel = data;
      meta = metaParsed;
    }
  }

  const statsData = {
    totalRefuelings: meta.total,
    totalLiters:
      fuel
        .reduce((sum, f) => {
          const liters = f.liters_amount || 0;
          return sum + liters;
        }, 0)
        .toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        }) + " L",
    totalAmount: fuel
      .reduce((sum, f) => {
        const amount = f.total_amount || 0;
        return sum + amount;
      }, 0)
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    verifiedOdometer: fuel.filter((f) => f.odometer_verified === true).length,
  };

  return (
    <>
      <FuelActions hasData={fuel.length > 0} />
      <PageStats stats={fuelStats} data={statsData} columns={4} />
      <DataTable
        data={fuel}
        meta={meta}
        columns={tableFuelColumns}
        responseError={fuelResponseError}
        toolbar={createElement(FuelToolbar)}
      />
    </>
  );
};

export { FuelContent };
