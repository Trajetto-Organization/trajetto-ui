"use client";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

import { ActivityPeriodSwitch } from "../period-switch";

interface ActivityPageActionsProps {
  /** The cards' window, beside Atualizar on the page's action line. */
  period: "7d" | "30d";
}

/**
 * The page's action line (decision 3.6), for the timeline and the table
 * alike: the 7 / 30 dias shortcuts, then Atualizar, which refreshes the
 * whole tab (decision 2.1).
 *
 * The shortcuts had a row of their own under Atualizar, so the button sat
 * alone a line above the controls it belongs with. In one group they share
 * the line with the view switch while it fits; on a phone they stack, the
 * shortcuts first, at full width like every page action.
 */
const ActivityPageActions = ({
  period,
}: ActivityPageActionsProps): JSX.Element => (
  <PageActions>
    <ActivityPeriodSwitch period={period} />
    <DataTableRevalidate
      rateLimit={{
        storageKey: "activity",
        maxClicks: 3,
        timeWindowMs: 30000,
        cooldownTimeMs: 15000,
      }}
    />
  </PageActions>
);

export { ActivityPageActions };
