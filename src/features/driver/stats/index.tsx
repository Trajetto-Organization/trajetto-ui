"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import {
  driverStatsData,
  type DriverListSearchMeta,
} from "../lib/driver-rules";
import { driverStats } from "../lib/stats-config";

interface DriverStatsProps {
  /** The aggregate the API streams before the rows. */
  searchMeta?: DriverListSearchMeta;
}

/**
 * On the client because the stat configs carry icon components and value
 * functions, which a server component may not call.
 */
const DriverStats = ({ searchMeta }: DriverStatsProps): JSX.Element => (
  <PageStats
    stats={driverStats}
    data={driverStatsData(searchMeta)}
    columns={4}
  />
);

export { DriverStats };
