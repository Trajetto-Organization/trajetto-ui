"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import { buildStatsData, routeStats } from "../lib/stats-config";

interface RoutesStatsProps {
  total: number;

  /** The aggregate line the API streams before the rows. */
  searchMeta?: Record<string, unknown>;
}

/**
 * On the client because the stat configs carry icon components: a server
 * component may pass such a module across the boundary, but calling its
 * functions there would only reach a client reference.
 */
const RoutesStats = ({ total, searchMeta }: RoutesStatsProps): JSX.Element => {
  return (
    <PageStats
      stats={routeStats}
      data={buildStatsData(total, searchMeta)}
      columns={4}
    />
  );
};

export { RoutesStats };
