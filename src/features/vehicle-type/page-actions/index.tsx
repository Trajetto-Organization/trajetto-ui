"use client";

import { useState } from "react";

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

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useFleetBusinessId } from "@/features/vehicle/hooks/use-fleet-business-id";

import { VehicleTypeFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

/** Atualizar and Novo tipo, in the band beside the company selector (3.6). */
const VehicleTypePageActions = (): JSX.Element => {
  const businessId = useFleetBusinessId();
  const actionClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const writePermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_TYPE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_TYPE_MANAGE),
    },
  ]);

  const canCreate = writePermissions.hasAllPermissions;

  return (
    <PageActions>
      <DataTableRevalidate
        rateLimit={{
          storageKey: "vehicle-type",
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
                <CreateButtonLabel>Novo tipo</CreateButtonLabel>
              </Button>
            </div>
          </TooltipTrigger>
          {!canCreate && (
            <TooltipContent className="max-w-sm">
              <p>{writePermissions.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {isCreateOpen && businessId && (
        <VehicleTypeFormDialog
          businessId={businessId}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}
    </PageActions>
  );
};

export { VehicleTypePageActions };
