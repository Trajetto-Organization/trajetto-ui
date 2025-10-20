import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { tableDriverCollumns } from "../../_components/admin/driver/table-driver-collumns";

import { DriverProps } from "../../_components/admin/driver/dto";
import { DriverToolbar } from "../../_components/admin/driver/driver-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

import { driverStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { DriverActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface DriverQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Motoristas",
    description: `
      Gerencie facilmente seus motoristas cadastrados. Consulte, edite e 
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Driver = async ({
  searchParams,
}: DriverQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let driverResponseError = {
    error: false,
    errorMessage: "",
  };

  let driver: DriverProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/driver/list-driver?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip", // Send header for compression
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["create-driver", "delete-driver", "update-driver"],
        },
      },
    );
  } catch (error) {
    driverResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de motoristas",
    };

    driver = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      driverResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de motoristas",
      };

      driver = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      driver = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalDrivers: meta.total,
    activeDrivers: driver.filter((d) => d.status === "ACTIVE").length,
    inactiveDrivers: driver.filter((d) => d.status === "INACTIVE").length,
    ownedDrivers: driver.filter((d) => d.contract_type === "OWNED").length,
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Motoristas"}
        description="Gerencie os motoristas cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <DriverActions />
      <PageStats stats={driverStats} data={statsData} columns={4} />

      <DataTable
        data={driver}
        meta={meta}
        columns={tableDriverCollumns}
        responseError={driverResponseError}
        toolbar={createElement(DriverToolbar)}
      />
    </PageContainer>
  );
};

export default Driver;
