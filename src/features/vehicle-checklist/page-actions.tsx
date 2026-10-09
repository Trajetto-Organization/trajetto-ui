"use client";

import { useSearchParams } from "next/navigation";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";

import { handleExportVehicleChecklist } from "@/actions/vehicle-checklist/export-vehicle-checklist";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useFleetBusinessId } from "@/features/vehicle/hooks/use-fleet-business-id";

import { CreateVehicleChecklistForm } from "./create-form";
import { checklistListQuery } from "./server-table";

/**
 * Exportar, Atualizar and Novo checklist in the band beside the company
 * selector (decision 3.6), the same on /admin and /dashboard.
 */
const VehicleChecklistPageActions = ({
  hasData,
}: {
  hasData: boolean;
}): JSX.Element => {
  const searchParams = useSearchParams();
  const businessId = useFleetBusinessId();

  const exportPermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_CHECKLIST_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_CHECKLIST_MANAGE),
    },
  ]);

  // The export follows the screen: its company, search and filters (5.8).
  const exportChecklists = (search?: string, format?: "csv" | "excel") =>
    handleExportVehicleChecklist(search, format, {
      businessId,
      filters: checklistListQuery(Object.fromEntries(searchParams.entries())),
    });

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        exportAction={exportChecklists}
        entityName="relatório de checklist veicular"
        writePermission={exportPermissions.hasAllPermissions}
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: "vehicle-checklist",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      {businessId && <CreateVehicleChecklistForm businessId={businessId} />}
    </PageActions>
  );
};

export { VehicleChecklistPageActions };
