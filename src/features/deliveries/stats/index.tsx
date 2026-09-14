"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import type { DeliveryTab } from "../lib/tabs";
import { STATS_BY_TAB, buildStatsData } from "../lib/stats-config";

interface DeliveriesStatsProps {
  activeTab: DeliveryTab;
  total: number;
  /** The aggregate line the API streams before the rows. */
  searchMeta?: Record<string, unknown>;
}

/**
 * Lives on the client because the stat configs carry icon components: a
 * server component may pass such a module across the boundary, but calling
 * its functions there would only reach a client reference.
 */
const DeliveriesStats = ({
  activeTab,
  total,
  searchMeta,
}: DeliveriesStatsProps): JSX.Element => {
  return (
    <PageStats
      stats={STATS_BY_TAB[activeTab]}
      data={buildStatsData(activeTab, total, searchMeta)}
      columns={4}
    />
  );
};

export { DeliveriesStats };
