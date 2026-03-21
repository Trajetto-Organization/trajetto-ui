import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { tableDriverCollumns } from "@/app/(protected)/_components/admin/driver/table-driver-collumns";

import type { DriverProps } from "@/app/(protected)/_components/admin/driver/driver.types";
import { DriverToolbar } from "@/app/(protected)/_components/admin/driver/driver-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { driverStats } from "./stats-config";
import { DriverActions } from "./page-actions";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface DriverContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const DriverContent = async ({
  searchParams,
  token,
}: DriverContentProps): Promise<JSX.Element> => {
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
    <>
      <DriverActions hasData={driver.length > 0} />
      <PageStats stats={driverStats} data={statsData} columns={4} />
      <DataTable
        data={driver}
        meta={meta}
        columns={tableDriverCollumns}
        responseError={driverResponseError}
        toolbar={createElement(DriverToolbar)}
      />
    </>
  );
};

export { DriverContent };
