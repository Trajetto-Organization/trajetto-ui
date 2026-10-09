"use client";

import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { AccountPayableSearchMeta } from "../lib/server-table";
import {
  TOTAL_ACCOUNTS_DESCRIPTION,
  accountPayableStatsData,
  countWithShare,
} from "../lib/stats-data";

const accountPayableStats: StatConfig[] = [
  {
    key: "total-accounts",
    title: "Total de Contas",
    valueKey: "totalAccounts",
    description: TOTAL_ACCOUNTS_DESCRIPTION,
    icon: FileText,
    variant: "primary",
  },
  {
    key: "open-accounts",
    title: "Em Aberto",
    valueKey: "openAccounts",
    icon: Clock,
    variant: "warning",
    calculateValue: (data) =>
      countWithShare(data.openAccounts || 0, data.totalAccounts || 0),
  },
  {
    key: "overdue-accounts",
    title: "Vencidas",
    valueKey: "overdueAccounts",
    icon: AlertTriangle,
    variant: "danger",
    calculateValue: (data) =>
      countWithShare(data.overdueAccounts || 0, data.totalAccounts || 0),
  },
  {
    key: "paid-accounts",
    title: "Pagas",
    valueKey: "paidAccounts",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) =>
      countWithShare(data.paidAccounts || 0, data.totalAccounts || 0),
  },
];

/**
 * On the client because the card configs carry icon components. Each card
 * also says the money behind it (what is left to pay, what is late, what
 * was paid), from the API's sums over the whole company.
 */
const AccountPayableStats = ({
  searchMeta,
}: {
  searchMeta?: AccountPayableSearchMeta;
}): JSX.Element => {
  const data = accountPayableStatsData(searchMeta);

  const stats = accountPayableStats.map((stat) => {
    if (stat.key === "open-accounts")
      return { ...stat, description: data.openAmountLabel };
    if (stat.key === "overdue-accounts")
      return { ...stat, description: data.overdueAmountLabel };
    if (stat.key === "paid-accounts")
      return { ...stat, description: data.paidAmountLabel };

    return stat;
  });

  return <PageStats stats={stats} data={data} columns={4} />;
};

export { AccountPayableStats };
