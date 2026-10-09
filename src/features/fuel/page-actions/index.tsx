"use client";

import { useSearchParams } from "next/navigation";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import type { ExportFormat } from "@/app/(protected)/_components/shared/custom/export-button/export-button.types";

import { handleExportFuel } from "@/actions/fuel/export-fuel";
import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useScopedBusinessId } from "../hooks/use-scoped-business-id";
import { businessIdQuery, type FleetScope } from "../lib/scope";
import { fuelFilterQuery } from "../lib/server-table";
import { CreateFuelDialog } from "../create-dialog";

interface FuelPageActionsProps {
  scope: FleetScope;
  hasData: boolean;
}

/**
 * Exportar, Atualizar and Criar on the company selector's line (decision
 * 3.6): the page actions' height (h-9, decision 16.61) there, full width with the label on a phone.
 *
 * The export carries what the screen filtered and, on /admin, the company
 * selected — the admin copy exported without either (decision 5.8).
 */
const FuelPageActions = ({
  scope,
  hasData,
}: FuelPageActionsProps): JSX.Element => {
  const searchParams = useSearchParams();
  const businessId = useScopedBusinessId(scope);
  const canExport = useHasPermission(permissions.FUEL_MANAGE, "write");

  const exportAction = (search?: string, format?: ExportFormat) =>
    handleExportFuel(search, format, {
      ...businessIdQuery(scope, businessId),
      ...fuelFilterQuery(searchParams),
    });

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        exportAction={exportAction}
        entityName="relatório de abastecimentos"
        writePermission={canExport}
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: "fuel",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      {businessId && <CreateFuelDialog businessId={businessId} />}
    </PageActions>
  );
};

export { FuelPageActions };
