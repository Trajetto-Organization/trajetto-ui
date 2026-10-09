"use client";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

/**
 * Atualizar on the page's action line (decision 3.6): full width with the
 * label on a phone, and it refreshes the whole tab (decision 2.1). Quotes
 * arrive from the public site; there is nothing to create here.
 */
const QuoteActions = (): JSX.Element => (
  <PageActions>
    <DataTableRevalidate
      rateLimit={{
        storageKey: "quote",
        maxClicks: 3,
        timeWindowMs: 30000,
        cooldownTimeMs: 15000,
      }}
    />
  </PageActions>
);

export { QuoteActions };
