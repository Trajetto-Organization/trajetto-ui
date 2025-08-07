import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { dashboardAccountPayableTableCollumns } from "../../_components/dashboard/dashboard-account-payable/dashboard-table-account-payable-collumns";

import { DashboardAccountPayableToolbar } from "../../_components/dashboard/dashboard-account-payable/dashboard-account-payable-toolbar";
import { DashboardAccountPayableProps } from "../../_components/dashboard/dashboard-account-payable/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface AccountPayableQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contas a pagar",
    description: `
      Gerencie de forma segura e intuitiva as contas a pagar de sua empresa. 
      Visualize, crie e edite privilégios para manter o controle total do sistema.`,
  };
}

const AccountPayable = async ({
  searchParams,
}: AccountPayableQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let accountPayableResponseError = {
    error: false,
    errorMessage: "",
  };

  let accountPayable: DashboardAccountPayableProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/account-payable/list-account-payable?page=${page}&pageSize=${pageSize}&search=${search}`,
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
            "create-account-payable",
            "delete-account-payable",
            "update-account-payable",
          ],
        },
      },
    );
  } catch (error) {
    accountPayableResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de contas a pagar",
    };

    accountPayable = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      accountPayableResponseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de contas a pagar",
      };

      accountPayable = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      accountPayable = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Contas a pagar"}
        description="Cadastre, monitore e gerencie suas contas a pagar."
      />

      <DataTable
        data={accountPayable}
        meta={meta}
        columns={dashboardAccountPayableTableCollumns}
        responseError={accountPayableResponseError}
        toolbar={createElement(DashboardAccountPayableToolbar)}
      />
    </PageContainer>
  );
};

export default AccountPayable;
