"use client";

import { useState } from "react";

import { Route as RouteIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";
import type { TableSelection } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { AddToRouteDialog } from "@/features/routes/add-to-route-dialog";
import { addToRouteBlocker } from "@/features/routes/lib/add-to-route";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

/**
 * The deliveries tab's bulk action, "Adicionar à rota", over the rows the
 * DataTable reports as checked. The only list with a batch, hence the only
 * one with checkboxes.
 */
function DeliveriesBulkActions({
  rows,
  clear,
}: TableSelection<DeliveryListItem>) {
  const businessId = useDeliveriesBusinessId();
  const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const pendingSelection = rows.filter(
    (delivery) => delivery.status === "PENDING",
  );

  // The API would refuse a mixed batch anyway; the button explains before
  // the request instead of after it.
  const selectionBlocker = addToRouteBlocker(rows);

  return (
    <>
      {/* Selection turns into a floating action pill over the table —
      Gmail-style bulk mode. It never disturbs the toolbar layout, and
      z-40 keeps it under the dialogs (z-50). */}
      {rows.length > 0 && (
        <div
          data-tutorial="deliveries-assign"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2
          flex items-center gap-3 rounded-full border bg-background
          px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {rows.length} selecionada
            {rows.length > 1 ? "s" : ""}
          </span>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    size="sm"
                    className="h-8 flex items-center gap-1"
                    disabled={!canWrite || selectionBlocker !== null}
                    onClick={() => setIsAssignOpen(true)}
                  >
                    <RouteIcon className="h-4 w-4" />
                    Adicionar à rota
                  </Button>
                </span>
              </TooltipTrigger>
              {(!canWrite || selectionBlocker) && (
                <TooltipContent className="max-w-xs">
                  <p>
                    {!canWrite
                      ? permissionsRequired.tooltipMessage
                      : selectionBlocker}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 flex items-center gap-1"
            onClick={clear}
            aria-label="Limpar seleção"
          >
            Limpar
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* The route is the unit of assignment (decision 14.7): the
      selection joins a route, never a driver directly. */}
      {businessId && isAssignOpen && (
        <AddToRouteDialog
          businessId={businessId}
          deliveries={pendingSelection}
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          onAdded={clear}
        />
      )}
    </>
  );
}

export { DeliveriesBulkActions };
