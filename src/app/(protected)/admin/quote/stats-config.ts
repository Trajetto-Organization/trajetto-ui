"use client";

import { FileText, Clock, Phone, CheckCircle2 } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Setting up statistics for the quotes page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const quoteStats: StatConfig[] = [
  {
    key: "total-quotes",
    title: "Total de Orçamentos",
    valueKey: "totalQuotes",
    description: "Solicitações recebidas",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "pending-quotes",
    title: "Pendentes",
    valueKey: "pendingQuotes",
    icon: Clock,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalQuotes || 0;
      const pending = data.pendingQuotes || 0;

      return total > 0
        ? `${pending} (${Math.round((pending / total) * 100)}%)`
        : "0";
    },
    description: "Aguardando contato",
  },
  {
    key: "contacted-quotes",
    title: "Contatados",
    valueKey: "contactedQuotes",
    icon: Phone,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalQuotes || 0;
      const contacted = data.contactedQuotes || 0;

      return total > 0
        ? `${contacted} (${Math.round((contacted / total) * 100)}%)`
        : "0";
    },
    description: "Em negociação",
  },
  {
    key: "converted-quotes",
    title: "Convertidos",
    valueKey: "convertedQuotes",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalQuotes || 0;
      const converted = data.convertedQuotes || 0;

      return total > 0
        ? `${converted} (${Math.round((converted / total) * 100)}%)`
        : "0";
    },
    description: "Clientes fechados",
  },
];

export { quoteStats };
