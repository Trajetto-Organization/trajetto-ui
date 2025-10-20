import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { accountPayableTableCollumns } from "../../_components/admin/account-payable/table-account-payable-collumns";

import { AccountPayableToolbar } from "../../_components/admin/account-payable/account-payable-toolbar";
import { AccountPayableProps } from "../../_components/admin/account-payable/dto";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

import { accountPayableStats } from "./stats-config";
import { PageStats } from "../../_components/stats/page-stats";

import { AccountPayableActions } from "./page-actions";

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

  let accountPayable: AccountPayableProps[] = [];
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

  // Calculates stats directly from the returned data
  const statsData = {
    totalAccounts: meta.total,
    paidAccounts: accountPayable.filter(
      (ap) => ap.status === "Pago" || ap.status === "Pago com atraso",
    ).length,
    pendingAccounts: accountPayable.filter(
      (ap) => ap.status === "Pendente" || ap.status === "Parcial",
    ).length,
    overdueAccounts: accountPayable.filter(
      (ap) =>
        ap.status === "Atrasado" ||
        ap.status === "Pago com atraso" ||
        ap.status === "Parcial com atraso",
    ).length,
  };

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Contas a pagar"}
        description="Cadastre, monitore e gerencie suas contas a pagar."
      />

      <AccountPayableActions />
      <PageStats stats={accountPayableStats} data={statsData} columns={4} />

      <DataTable
        data={accountPayable}
        meta={meta}
        columns={accountPayableTableCollumns}
        responseError={accountPayableResponseError}
        toolbar={createElement(AccountPayableToolbar)}
      />
    </PageContainer>
  );
};

export default AccountPayable;
