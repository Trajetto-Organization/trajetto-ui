"use client";

import { FileText, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { StatConfig } from "../../_components/stats/dto";

/**
 * Setting up statistics for the work order page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const serviceOrderStats: StatConfig[] = [
  {
    key: "total-service-orders",
    title: "Total de Ordens",
    valueKey: "totalServiceOrders",
    description: "Cadastradas no sistema",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "completed-orders",
    title: "Ordens Concluídas",
    valueKey: "completedOrders",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalServiceOrders || 0;
      const completed = data.completedOrders || 0;

      return total > 0
        ? `${completed} (${Math.round((completed / total) * 100)}%)`
        : "0";
    },
    description: "Com data de conclusão",
  },
  {
    key: "pending-orders",
    title: "Ordens Pendentes",
    valueKey: "pendingOrders",
    icon: Clock,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalServiceOrders || 0;
      const pending = data.pendingOrders || 0;

      return total > 0
        ? `${pending} (${Math.round((pending / total) * 100)}%)`
        : "0";
    },
    description: "Aguardando conclusão",
  },
  {
    key: "total-amount",
    title: "Valor Total",
    valueKey: "totalAmount",
    icon: DollarSign,
    variant: "primary",
    description: "Soma de todas as ordens",
  },
];

export { serviceOrderStats };
