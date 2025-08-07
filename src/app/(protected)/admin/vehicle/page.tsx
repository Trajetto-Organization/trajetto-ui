import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { tableVehicleCollumns } from "../../_components/admin/vehicle/table-vehicle-collumns";

import { VehicleProps } from "../../_components/admin/vehicle/dto";
import { VehicleToolbar } from "../../_components/admin/vehicle/vehicle-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface VehicleQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Veículos",
    description: `
      Gerencie facilmente seus veículos cadastrados. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Vehicle = async ({
  searchParams,
}: VehicleQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let vehicleResponseError = {
    error: false,
    errorMessage: "",
  };

  let vehicle: VehicleProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/vehicle/list-vehicle?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-vehicle", "delete-vehicle", "update-vehicle"],
        },
      },
    );
  } catch (error) {
    vehicleResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de veículos",
    };

    vehicle = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      vehicleResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de veículos",
      };

      vehicle = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      vehicle = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Veículos"}
        description="Gerencie os veículos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <DataTable
        data={vehicle}
        meta={meta}
        columns={tableVehicleCollumns}
        responseError={vehicleResponseError}
        toolbar={createElement(VehicleToolbar)}
      />
    </PageContainer>
  );
};

export default Vehicle;
