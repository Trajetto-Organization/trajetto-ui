"use client";

import { Crown, Shapes, Truck, type LucideIcon } from "lucide-react";

import { StatCard } from "@/app/(protected)/_components/shared/stats/stat-card";
import { StatsGrid } from "@/app/(protected)/_components/shared/stats/stats-grid";

import type { VehicleTypeListSearchMeta } from "../types";
import { vehicleTypeStatCards } from "../lib/stats";

const ICONS: Record<string, LucideIcon> = {
  types: Shapes,
  vehicles: Truck,
  "most-used": Crown,
};

interface VehicleTypeStatsProps {
  searchMeta?: VehicleTypeListSearchMeta;
  /** The pager total; undefined when the list request failed. */
  total: number | undefined;
}

/** On the client: the cards carry icon components. */
const VehicleTypeStats = ({
  searchMeta,
  total,
}: VehicleTypeStatsProps): JSX.Element => (
  <StatsGrid columns={3}>
    {vehicleTypeStatCards(searchMeta, total).map((card) => (
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

export { VehicleTypeStats };
