"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import {
  permissionStatsData,
  type PermissionListSearchMeta,
} from "../lib/permission-rules";
import { permissionStats } from "../lib/stats-config";

interface PermissionStatsProps {
  /** The aggregate the API streams before the rows. */
  searchMeta?: PermissionListSearchMeta;
}

/**
 * On the client because the stat configs carry icon components and value
 * functions, which a server component may not call.
 */
const PermissionStats = ({ searchMeta }: PermissionStatsProps): JSX.Element => (
  <PageStats
    stats={permissionStats}
    data={permissionStatsData(searchMeta)}
    columns={3}
  />
);

export { PermissionStats };
