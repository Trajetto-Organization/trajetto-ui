"use client";

import { FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { StatConfig } from "../../_components/stats/dto";

/**
 * Setting up statistics for the Accounts Payable page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const accountPayableStats: StatConfig[] = [
  {
    key: "total-accounts",
    title: "Total de Contas",
    valueKey: "totalAccounts",
    description: "Cadastradas no sistema",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "paid-accounts",
    title: "Contas Pagas",
    valueKey: "paidAccounts",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalAccounts || 0;
      const paid = data.paidAccounts || 0;

      return total > 0 ? `${paid} (${Math.round((paid / total) * 100)}%)` : "0";
    },
    description: "Quitadas",
  },
  {
    key: "pending-accounts",
    title: "Contas Pendentes",
    valueKey: "pendingAccounts",
    icon: Clock,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalAccounts || 0;
      const pending = data.pendingAccounts || 0;

      return total > 0
        ? `${pending} (${Math.round((pending / total) * 100)}%)`
        : "0";
    },
    description: "Aguardando pagamento",
  },
  {
    key: "overdue-accounts",
    title: "Contas Atrasadas",
    valueKey: "overdueAccounts",
    icon: AlertTriangle,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalAccounts || 0;
      const overdue = data.overdueAccounts || 0;

      return total > 0
        ? `${overdue} (${Math.round((overdue / total) * 100)}%)`
        : "0";
    },
    description: "Vencidas",
  },
];

export { accountPayableStats };
