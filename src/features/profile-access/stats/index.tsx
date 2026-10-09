"use client";

import { Crown, ShieldCheck, Users, type LucideIcon } from "lucide-react";

import { StatCard } from "@/app/(protected)/_components/shared/stats/stat-card";
import { StatsGrid } from "@/app/(protected)/_components/shared/stats/stats-grid";

import type { ProfileAccessListSearchMeta } from "../types";
import { profileAccessStatCards } from "../lib/stats";

const ICONS: Record<string, LucideIcon> = {
  profiles: ShieldCheck,
  "linked-users": Users,
  "most-used": Crown,
};

interface ProfileAccessStatsProps {
  searchMeta?: ProfileAccessListSearchMeta;
  /** The pager total; undefined when the list request failed. */
  total: number | undefined;
}

/** On the client: the cards carry icon components. */
const ProfileAccessStats = ({
  searchMeta,
  total,
}: ProfileAccessStatsProps): JSX.Element => (
  <StatsGrid columns={3}>
    {profileAccessStatCards(searchMeta, total).map((card) => (
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

export { ProfileAccessStats };
