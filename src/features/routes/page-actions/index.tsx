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
      /**
       * One row on a phone, a wrapping bar from `sm` up — the same shape
       * Entregas uses.
       *
       * It used to stack full width below `sm`: two buttons, about 90px of
       * vertical space above the first card, for a refresh whose icon says
       * what it is. Beside it, Entregas fitted four actions into one row on
       * the same screen. Two pages of the same product, two answers.
       *
       * `sm:flex-wrap` is load-bearing from `sm` up: `nowrap` is the flex
       * default, so the buttons became a single row that neither wraps nor
       * shrinks, needing more than an iPad in portrait offers — and the shell
       * clips, so the rightmost sat off-screen with no scrollbar.
       */
      className="flex w-full min-w-0 items-center gap-2 sm:w-auto
      sm:flex-wrap sm:justify-end sm:ml-auto"
    >
      <div className="shrink-0 sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-route"
          hideLabelOnMobile
          className="h-9 w-9 p-0 sm:h-8 sm:w-full sm:px-3"
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
              <div className="min-w-0 flex-1 sm:w-auto sm:flex-initial">
                <Button
                  size="sm"
                  className="h-9 w-full sm:h-8"
                  disabled={!canWrite}
                  data-tutorial="create-button"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4 shrink-0" />
                  <span className="truncate">Nova Rota</span>
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
