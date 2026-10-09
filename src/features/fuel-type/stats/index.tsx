"use client";

import {
  Car,
  Crown,
  Droplet,
  Fuel,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { StatCard } from "@/app/(protected)/_components/shared/stats/stat-card";
import { StatsGrid } from "@/app/(protected)/_components/shared/stats/stats-grid";

import type { FuelTypeListSearchMeta } from "../lib/types";
import { fuelTypeStatCards } from "../lib/stats";

const ICONS: Record<string, LucideIcon> = {
  types: Fuel,
  refuelings: Receipt,
  "most-refueled": Droplet,
  vehicles: Car,
  "most-used": Crown,
};

interface FuelTypeStatsProps {
  searchMeta?: FuelTypeListSearchMeta;
  /** The pager total; undefined when the list request failed. */
  total: number | undefined;
}

/** On the client: the cards carry icon components. */
const FuelTypeStats = ({
  searchMeta,
  total,
}: FuelTypeStatsProps): JSX.Element => (
  <StatsGrid columns={3}>
    {fuelTypeStatCards(searchMeta, total).map((card) => (
      <StatCard
        key={card.key}
        title={card.title}
        value={card.value}
        description={card.description}
        icon={ICONS[card.key]}
        variant={card.variant}
      />
    ))}
  </StatsGrid>
);

export { FuelTypeStats };
