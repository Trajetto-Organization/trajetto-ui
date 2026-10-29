"use client";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { CreateBusinessForm } from "@/app/(protected)/_components/admin/business/create-business-form";

/**
 * Atualizar and Criar Empresa on the page's action line (decision 3.6):
 * full width with the label on a phone. Atualizar refreshes the whole tab
 * (decision 2.1).
 */
const BusinessActions = (): JSX.Element => (
  <PageActions>
    <DataTableRevalidate
      rateLimit={{
        storageKey: "business",
        maxClicks: 3,
        timeWindowMs: 30000,
        cooldownTimeMs: 15000,
      }}
    />

    <CreateBusinessForm />
  </PageActions>
);

export { BusinessActions };
