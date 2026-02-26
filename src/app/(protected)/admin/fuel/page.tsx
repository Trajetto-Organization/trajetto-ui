import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { tableFuelColumns } from "../../_components/admin/fuel/table-fuel-collumns";

import { FuelProps } from "../../_components/dto";
import { FuelToolbar } from "../../_components/admin/fuel/fuel-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

import { fuelStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { FuelActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface FuelQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Abastecimento",
    description: `
      Gerencie facilmente os abastecimentos cadastrados. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Fuel = async ({
  searchParams,
}: FuelQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

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
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
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
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      fuel = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalRefuelings: meta.total,
    totalLiters:
      fuel
        .reduce((sum, f) => {
          // liters_amount comes as number from RAW data
          const liters = f.liters_amount || 0;
          return sum + liters;
        }, 0)
        .toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        }) + " L",
    totalAmount: fuel
      .reduce((sum, f) => {
        // total_amount comes as number from RAW data
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
    <PageContainer>
      <ProtectedHeading
        title={"Abastecimento"}
        description="Gerencie os abastecimentos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <FuelActions hasData={fuel.length > 0} />
      <PageStats stats={fuelStats} data={statsData} columns={4} />

      <DataTable
        data={fuel}
        meta={meta}
        columns={tableFuelColumns}
        responseError={fuelResponseError}
        toolbar={createElement(FuelToolbar)}
      />
    </PageContainer>
  );
};

export default Fuel;
