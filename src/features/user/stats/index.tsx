"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import { userStatsData, type UserListSearchMeta } from "../lib/user-rules";
import { masterUserStats, userStats } from "../lib/stats-config";

interface UserStatsProps {
  /** The aggregate the API streams before the rows. */
  searchMeta?: UserListSearchMeta;
  /** The pager's total (search + every filter). */
  listTotal?: number;
  /** The platform's masters (/admin/master-users) or a company's users. */
  variant?: "users" | "masters";
}

/**
 * On the client because the stat configs carry icon components and value
 * functions, which a server component may not call.
 */
const UserStats = ({
  searchMeta,
  listTotal,
  variant = "users",
}: UserStatsProps): JSX.Element => (
  <PageStats
    stats={variant === "masters" ? masterUserStats : userStats}
    data={userStatsData(searchMeta, listTotal)}
    columns={4}
  />
);

export { UserStats };
