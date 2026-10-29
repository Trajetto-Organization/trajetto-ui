"use client";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

/**
 * The report is read-only: Atualizar is its only action (decision 2.1, the
 * global refresh of the screen). Laid out by PageActions (decision 3.6): full
 * width with its label on a phone, the page actions' height (h-9, decision 16.61) on /admin.
 */
const DriverPausesPageActions = (): JSX.Element => (
  <PageActions>
    <DataTableRevalidate
      rateLimit={{
        storageKey: "driver-pauses",
        maxClicks: 3,
        timeWindowMs: 30000,
        cooldownTimeMs: 15000,
      }}
    />
  </PageActions>
);

export { DriverPausesPageActions };
