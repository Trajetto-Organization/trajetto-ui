"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import { buildStatsData, routeStats } from "../lib/stats-config";
import type { RouteListSearchMeta } from "../server-table";

interface RoutesStatsProps {
  /**
   * The aggregate line the API streams before the rows. The cards read only
   * this, never the pager's total, which counts a different set.
   */
  searchMeta?: RouteListSearchMeta;
}

/**
 * On the client because the stat configs carry icon components: a server
 * component may pass such a module across the boundary, but calling its
 * functions there would only reach a client reference.
 */
const RoutesStats = ({ searchMeta }: RoutesStatsProps): JSX.Element => {
  return (
    <PageStats
      stats={routeStats}
      data={buildStatsData(searchMeta)}
      columns={4}
    />
  );
};

export { RoutesStats };
