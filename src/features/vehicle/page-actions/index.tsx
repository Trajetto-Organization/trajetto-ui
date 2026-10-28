"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";

import { exportVehicleRequest } from "@/lib/export-requests";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { vehicleListQuery } from "../server-table";
import { VehicleFormDialog } from "../form-dialog";
import { useFleetBusinessId } from "../hooks/use-fleet-business-id";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

interface VehiclePageActionsProps {
  hasData: boolean;
}

/**
 * Exportar, Atualizar and Novo veículo, on the company selector's line on
 * /admin and /dashboard (h-9, decision 16.61) and full width with their labels on a phone (decision 3.6).
 * A button the person may not use stays visible, disabled, with the reason.
 */
const VehiclePageActions = ({
  hasData,
}: VehiclePageActionsProps): JSX.Element => {
  const searchParams = useSearchParams();
  const businessId = useFleetBusinessId();
  const actionClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const createPermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);

  const exportPermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
  ]);

  // The export follows the screen: its company, search and filters (5.8).
  const exportVehicles = (search?: string, format?: "csv" | "excel") =>
    exportVehicleRequest(search, format, {
      businessId,
      filters: vehicleListQuery(Object.fromEntries(searchParams.entries())),
    });

  const canCreate = createPermissions.hasAllPermissions;

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        exportRequest={exportVehicles}
        entityName="relatório de veículos"
        writePermission={exportPermissions.hasAllPermissions}
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: "vehicle",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                size="sm"
                className={actionClassName}
                disabled={!canCreate || !businessId}
                data-tutorial="create-button"
                onClick={() => setIsCreateOpen(true)}
              >
                <CreateButtonLabel>Novo veículo</CreateButtonLabel>
              </Button>
            </div>
          </TooltipTrigger>
          {!canCreate && (
            <TooltipContent className="max-w-sm">
              <p>{createPermissions.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {isCreateOpen && businessId && (
        <VehicleFormDialog
          businessId={businessId}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}
    </PageActions>
  );
};

export { VehiclePageActions };
