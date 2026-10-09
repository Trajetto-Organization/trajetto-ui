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

import { useFleetBusinessId } from "@/features/service-order/hooks/use-fleet-business-id";
import type { FleetScope } from "@/features/service-order/lib/service-order-rules";

import { PartFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

/**
 * Atualizar and Criar Peça, on the page action row (h-9, decision 16.61) and at
 * full width with labels on a phone (decision 3.6). The button stays when the
 * permission is missing and says why.
 */
const PartPageActions = ({ scope }: { scope: FleetScope }): JSX.Element => {
  const businessId = useFleetBusinessId(scope);
  const actionClassName = usePageActionClassName();

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const write = useCheckMultiplePermissions([
    {
      key: permissions.PART_MANAGE,
      action: "write",
      label: getPermissionName(permissions.PART_MANAGE),
    },
  ]);

  return (
    <PageActions>
      <DataTableRevalidate
        rateLimit={{
          storageKey: "part",
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
                  <CreateButtonLabel>Criar Peça</CreateButtonLabel>
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
        <PartFormDialog
          businessId={businessId}
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
        />
      )}
    </PageActions>
  );
};

export { PartPageActions };
