"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useRoutesBusinessId } from "../hooks/use-routes-business-id";
import { RouteFormDialog } from "../form-dialog";

/**
 * Refresh and create, with the same contract as every other module: the
 * create button stays on screen when the user lacks the permission and
 * explains itself on hover. Hiding it leaves them with no way to learn what
 * is missing.
 *
 * `delivery_manage` and not a permission of its own: a route is how deliveries
 * are dispatched, and whoever can write deliveries can already assign a driver
 * to twelve of them from the delivery screen — the same act. A second
 * permission would not be a second lock, it would be a second door.
 */
const RoutesPageActions = (): JSX.Element => {
  const businessId = useRoutesBusinessId();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  return (
    <div
      className="flex w-full flex-col items-stretch gap-3
      sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center
      sm:gap-2 sm:justify-end sm:ml-auto"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-route"
          rateLimit={{
            storageKey: "routes-table",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>

      {businessId && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!canWrite}
                  data-tutorial="create-button"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Nova Rota
                </Button>
              </div>
            </TooltipTrigger>
            {!canWrite && (
              <TooltipContent className="max-w-sm">
                <p>{permissionsRequired.tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {isCreateOpen && businessId && (
        <RouteFormDialog
          businessId={businessId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
};

export { RoutesPageActions };
