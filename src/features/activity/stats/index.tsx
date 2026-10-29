"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import type { ActivitySummaryData } from "@/actions/activity/get-activity-summary";
import { activityStats, buildActivityStatsData } from "../lib/stats-config";

interface ActivityStatsProps {
  summary: ActivitySummaryData | null;
}

/**
 * Client side because the stat configs carry icon components — a server
 * component may pass such a module across the boundary, but calling its
 * functions there would only reach a client reference.
 */
const ActivityStats = ({ summary }: ActivityStatsProps): JSX.Element => {
  return (
    <PageStats
      stats={activityStats}
      data={buildActivityStatsData(summary)}
      columns={4}
    />
  );
};

export { ActivityStats };
