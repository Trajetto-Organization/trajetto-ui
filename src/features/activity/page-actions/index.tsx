"use client";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

/**
 * Atualizar on the page's action line (decision 3.6), for the timeline and
 * the table alike: it refreshes the whole tab (decision 2.1). It used to
 * live only in the table's toolbar, so the timeline had none.
 */
const ActivityPageActions = (): JSX.Element => (
  <PageActions>
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
