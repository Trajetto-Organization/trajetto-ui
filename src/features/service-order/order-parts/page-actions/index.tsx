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

import { useFleetBusinessId } from "../../hooks/use-fleet-business-id";
import type { FleetScope } from "../../lib/service-order-rules";

import { OrderPartFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

/** Atualizar and Lançar Peça, with the row's height and phone layout (3.6). */
const OrderPartPageActions = ({
  scope,
}: {
  scope: FleetScope;
}): JSX.Element => {
  const businessId = useFleetBusinessId(scope);
  const actionClassName = usePageActionClassName();

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const write = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_PART_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_PART_MANAGE),
    },
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
    },
    {
      key: permissions.PART_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PART_MANAGE),
    },
  ]);

  return (
    <PageActions>
      <DataTableRevalidate
        rateLimit={{
          storageKey: "service-order-part",
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
                  className={actionClassName}
                  disabled={!write.hasAllPermissions}
                  data-tutorial="create-button"
                  onClick={() => setIsCreating(true)}
                >
                  <CreateButtonLabel>Lançar Peça na Ordem</CreateButtonLabel>
                </Button>
              </div>
            </TooltipTrigger>
            {!write.hasAllPermissions && (
              <TooltipContent className="max-w-sm">
                <p>{write.tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {isCreating && businessId && (
        <OrderPartFormDialog
          businessId={businessId}
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
        />
      )}
    </PageActions>
  );
};

export { OrderPartPageActions };
