import { createElement } from "react";
import { redirect } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { accountPayableTableCollumns } from "@/app/(protected)/_components/admin/account-payable/table-account-payable-collumns";

import type { AccountPayableProps } from "@/app/(protected)/_components/admin/account-payable/account-payable.types";
import { AccountPayableToolbar } from "@/app/(protected)/_components/admin/account-payable/account-payable-toolbar";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { accountPayableStats } from "./stats-config";

// Helper function to calculate account payable status
type AccountPayableStatus =
  | "PENDING"
  | "PAID"
  | "PARTIAL"
  | "LATE"
  | "PARTIAL_LATE"
  | "OVERDUE";

function calculateAccountPayableStatus(
  amount: number,
  amountPaid: number | null,
  dueDate: Date | string,
  paymentDate: Date | string | null,
): AccountPayableStatus {
  let status: AccountPayableStatus = "PENDING";

  const currentDate = new Date();
  const dueDateObj = new Date(dueDate);

  const isOverdue = currentDate > dueDateObj;

  if (paymentDate) {
    const paid = amountPaid || 0;
    const paymentDateObj = new Date(paymentDate);

    const isPaidLate = paymentDateObj > dueDateObj;

    if (paid >= amount) {
      // Full payment
      status = isPaidLate ? "LATE" : "PAID";
    } else if (paid > 0) {
      // Partial payment
      if (isPaidLate) {
        status = "PARTIAL_LATE";
      } else if (isOverdue) {
        status = "PARTIAL_LATE";
      } else {
        status = "PARTIAL";
      }
    }
  } else {
    // No payment date
    status = isOverdue ? "OVERDUE" : "PENDING";
  }

  return status;
}

function translateAccountPayableStatus(status: AccountPayableStatus): string {
  const translations: Record<AccountPayableStatus, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    PARTIAL: "Parcial",
    LATE: "Pago com atraso",
    PARTIAL_LATE: "Parcial com atraso",
    OVERDUE: "Vencido",
  };

  return translations[status];
}

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface AccountPayableContentProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
  token: string;
}

const AccountPayableContent = async ({
  searchParams,
  token,
}: AccountPayableContentProps): Promise<JSX.Element> => {
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
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
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
      const { meta: metaParsed, data } = await parseNDJSON(response);

      accountPayable = data;
      meta = metaParsed;
    }
  }

  // Calculates stats directly from the returned data
  const statsData = {
    totalAccounts: meta.total,
    paidAccounts: accountPayable.filter((ap) => {
      const status = calculateAccountPayableStatus(
        ap.amount,
        ap.amount_paid,
        ap.due_date,
        ap.payment_date,
      );

      const translatedStatus = translateAccountPayableStatus(status);
      return (
        translatedStatus === "Pago" || translatedStatus === "Pago com atraso"
      );
    }).length,
    pendingAccounts: accountPayable.filter((ap) => {
      const status = calculateAccountPayableStatus(
        ap.amount,
        ap.amount_paid,
        ap.due_date,
        ap.payment_date,
      );

      const translatedStatus = translateAccountPayableStatus(status);
      return translatedStatus === "Pendente" || translatedStatus === "Parcial";
    }).length,
    overdueAccounts: accountPayable.filter((ap) => {
      const status = calculateAccountPayableStatus(
        ap.amount,
        ap.amount_paid,
        ap.due_date,
        ap.payment_date,
      );

      const translatedStatus = translateAccountPayableStatus(status);
      return (
        translatedStatus === "Vencido" ||
        translatedStatus === "Pago com atraso" ||
        translatedStatus === "Parcial com atraso"
      );
    }).length,
  };

  return (
    <>
      <PageStats stats={accountPayableStats} data={statsData} columns={4} />
      <DataTable
        data={accountPayable}
        meta={meta}
        columns={accountPayableTableCollumns}
        responseError={accountPayableResponseError}
        toolbar={createElement(AccountPayableToolbar)}
      />
    </>
  );
};

export { AccountPayableContent };
