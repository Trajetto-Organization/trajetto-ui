"use client";

import { FileText, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { StatConfig } from "../../_components/stats/dto";

/**
 * Setting up statistics for the fines page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const fineStats: StatConfig[] = [
  {
    key: "total-fines",
    title: "Total de Multas",
    valueKey: "totalFines",
    description: "Cadastradas no sistema",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "paid-fines",
    title: "Multas Pagas",
    valueKey: "paidFines",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalFines || 0;
      const paid = data.paidFines || 0;

      return total > 0 ? `${paid} (${Math.round((paid / total) * 100)}%)` : "0";
    },
    description: "Com pagamento confirmado",
  },
  {
    key: "pending-fines",
    title: "Multas Pendentes",
    valueKey: "pendingFines",
    icon: AlertCircle,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalFines || 0;
      const pending = data.pendingFines || 0;

      return total > 0
        ? `${pending} (${Math.round((pending / total) * 100)}%)`
        : "0";
    },
    description: "Aguardando pagamento",
  },
  {
    key: "total-points",
    title: "Total de Pontos",
    valueKey: "totalPoints",
    description: "Pontos acumulados",
    icon: DollarSign,
    variant: "danger",
  },
];

export { fineStats };
