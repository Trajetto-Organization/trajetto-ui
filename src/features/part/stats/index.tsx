"use client";

import { DollarSign, Package, Truck, Unlink } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { partStatsData, type PartSearchMeta } from "../lib/part-rules";

const PART_STATS: StatConfig[] = [
  {
    key: "total-parts",
    title: "Total de Peças",
    valueKey: "totalParts",
    description: "Da busca, sem o filtro de fornecedor",
    icon: Package,
    variant: "primary",
  },
  {
    key: "average-price",
    title: "Preço Médio",
    valueKey: "averagePrice",
    description: "Preço unitário médio das mesmas peças",
    icon: DollarSign,
    variant: "primary",
  },
  {
    key: "with-supplier",
    title: "Com Fornecedor",
    valueKey: "withSupplier",
    description: "Peças com fornecedor cadastrado",
    icon: Truck,
    variant: "success",
  },
  {
    key: "without-supplier",
    title: "Sem Fornecedor",
    valueKey: "withoutSupplier",
    description: "Peças sem fornecedor",
    icon: Unlink,
    variant: "warning",
  },
];

const PartStats = ({
  searchMeta,
}: {
  searchMeta?: PartSearchMeta;
}): JSX.Element => (
  <PageStats
    stats={PART_STATS}
    data={{ ...partStatsData(searchMeta) }}
    columns={4}
  />
);

export { PartStats };
