"use client";

import { CheckCircle2, Clock, FileText, Phone } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { QuoteSearchMeta } from "../lib/server-table";
import { countWithShare, quoteStatsData } from "../lib/stats-data";

const quoteStats: StatConfig[] = [
  {
    key: "total-quotes",
    title: "Total de Orçamentos",
    valueKey: "totalQuotes",
    description: "Na busca e nos filtros atuais",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "pending-quotes",
    title: "Pendentes",
    valueKey: "pendingQuotes",
    icon: Clock,
    variant: "warning",
    calculateValue: (data) =>
      countWithShare(
        Number(data.pendingQuotes) || 0,
        Number(data.stageBase) || 0,
      ),
    description: "Aguardando contato",
  },
  {
    key: "contacted-quotes",
    title: "Contatados",
    valueKey: "contactedQuotes",
    icon: Phone,
    variant: "primary",
    calculateValue: (data) =>
      countWithShare(
        Number(data.contactedQuotes) || 0,
        Number(data.stageBase) || 0,
      ),
    description: "Em negociação",
  },
  {
    key: "converted-quotes",
    title: "Convertidos",
    valueKey: "convertedQuotes",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) =>
      countWithShare(
        Number(data.convertedQuotes) || 0,
        Number(data.stageBase) || 0,
      ),
    description: "Clientes fechados",
  },
];

/**
 * Client side because the stat configs carry icon components; the numbers
 * are the API's over every quote (decision 8.8), never the page's.
 */
const QuoteStats = ({
  searchMeta,
}: {
  searchMeta: QuoteSearchMeta | undefined;
}): JSX.Element => (
  <PageStats
    stats={quoteStats}
    data={quoteStatsData(searchMeta) as unknown as Record<string, number>}
    columns={4}
  />
);

export { QuoteStats };
