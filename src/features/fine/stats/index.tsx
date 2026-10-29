"use client";

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileText,
} from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { countWithShare, fineCardsData, formatAmount } from "../lib/stats";
import type { FineListSearchMeta } from "../lib/types";

interface FineStatsProps {
  searchMeta?: FineListSearchMeta;
}

/**
 * The four cards of the fines screen, from the API's `searchMeta` only:
 * counted over the whole company with the search and the other filters,
 * never over the rows of the page (decision 8.8).
 */
const FineStats = ({ searchMeta }: FineStatsProps): JSX.Element => {
  const data = fineCardsData(searchMeta);

  const stats: StatConfig[] = [
    {
      key: "total-fines",
      title: "Total de Multas",
      valueKey: "total",
      description: `${formatAmount(data.totalAmount)} em multas`,
      icon: FileText,
      variant: "primary",
    },
    {
      key: "paid-fines",
      title: "Pagas",
      valueKey: "paid",
      icon: CheckCircle2,
      variant: "success",
      calculateValue: () => countWithShare(data.paid, data.total),
      description: "Com pagamento registrado",
    },
    {
      key: "pending-fines",
      title: "A vencer",
      valueKey: "pending",
      icon: CalendarClock,
      variant: "warning",
      calculateValue: () => countWithShare(data.pending, data.total),
      description: "Em aberto, dentro do prazo",
    },
    {
      key: "overdue-fines",
      title: "Vencidas",
      valueKey: "overdue",
      icon: AlertCircle,
      variant: "danger",
      calculateValue: () => countWithShare(data.overdue, data.total),
      description: `${formatAmount(data.openAmount)} em aberto no total`,
    },
  ];

  return <PageStats stats={stats} data={{ ...data }} columns={4} />;
};

export { FineStats };
