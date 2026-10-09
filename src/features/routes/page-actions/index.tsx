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

import { useRoutesBusinessId } from "../hooks/use-routes-business-id";
import { RouteFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

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
 *
 * Laid out by PageActions (decision 3.6): on a phone both buttons stack at
 * full width with their labels, Atualizar included; from `sm` they share one
 * row, at the page actions' height (h-9, decision 16.61) on /admin.
 */
const RoutesPageActions = (): JSX.Element => {
  const businessId = useRoutesBusinessId();

  const buttonClassName = usePageActionClassName();

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
    <>
      <PageActions>
        <DataTableRevalidate
          rateLimit={{
            storageKey: "routes-table",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />

        {businessId && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    size="sm"
                    className={buttonClassName}
                    disabled={!canWrite}
                    data-tutorial="create-button"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <CreateButtonLabel>Nova Rota</CreateButtonLabel>
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
      </PageActions>

      {isCreateOpen && businessId && (
        <RouteFormDialog
          businessId={businessId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </>
  );
};

export { RoutesPageActions };
