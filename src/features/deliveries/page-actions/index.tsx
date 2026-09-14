"use client";

import { useState } from "react";
import { FileUp, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

import { permissions } from "@/lib/permissions";
import type { RevalidateDataProps } from "@/lib/query-keys-mapping";
import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import type { DeliveryTab } from "../lib/tabs";

import { DeliveryFormDialog } from "../deliveries/form-dialog";
import { ImportXmlDialog } from "../deliveries/import-xml-dialog";

import { ShipperFormDialog } from "../shippers/form-dialog";
import { OccurrenceTypeFormDialog } from "../occurrence-types/form-dialog";

interface DeliveriesPageActionsProps {
  activeTab: DeliveryTab;
}

/**
 * Revalidation tag per tab — each table has its own server cache.
 *
 * The chat is the exception and has its own: nothing about it is fetched on
 * the server, so what it needs revalidated are the react-query keys the
 * panel lives on. `query-keys-mapping` is where that list is kept, and the
 * refresh button already invalidates whatever a tag maps to.
 */
const REVALIDATE_TAG: Record<DeliveryTab, RevalidateDataProps> = {
  deliveries: "update-delivery",
  occurrences: "update-delivery",
  monitoring: "update-delivery",
  chat: "update-chat",
  shippers: "update-shipper",
  "occurrence-types": "update-occurrence-type",
};

const RATE_LIMIT_KEY: Record<DeliveryTab, string> = {
  deliveries: "deliveries-table",
  occurrences: "deliveries-occurrences-table",
  monitoring: "deliveries-monitoring-panel",
  chat: "deliveries-chat-panel",
  shippers: "deliveries-shippers-table",
  "occurrence-types": "deliveries-occurrence-types-table",
};

/**
 * Write permission behind each tab, mirroring the API guards: shippers ride
 * on delivery_manage, occurrence types have their own key.
 */
const WRITE_PERMISSION: Record<DeliveryTab, PermissionKey> = {
  deliveries: permissions.DELIVERY_MANAGE,
  occurrences: permissions.OCCURRENCE_MANAGE,
  monitoring: permissions.DELIVERY_MANAGE,
  chat: permissions.DELIVERY_MANAGE,
  shippers: permissions.DELIVERY_MANAGE,
  "occurrence-types": permissions.OCCURRENCE_MANAGE,
};

/** Empty = read-only tab (panels): no create button to offer. */
const CREATE_LABEL: Record<DeliveryTab, string> = {
  deliveries: "Nova Entrega",
  occurrences: "",
  monitoring: "",
  // The chat's own header carries "Nova conversa" and the mass notice —
  // the generic create button would be a second, orphaned way in.
  chat: "",
  shippers: "Novo Embarcador",
  "occurrence-types": "Novo Tipo",
};

const DeliveriesPageActions = ({
  activeTab,
}: DeliveriesPageActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  // Same contract as the rest of the app: the button stays on screen and
  // explains itself on hover. Hiding it left the user with no way to learn
  // which permission is missing — the reason every other module shows a
  // disabled trigger instead.
  const requiredPermission = WRITE_PERMISSION[activeTab];

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: requiredPermission,
      action: "write",
      label: getPermissionName(requiredPermission),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  return (
    <div
      className="flex w-full flex-col items-stretch gap-3
      sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center
      sm:gap-2 sm:justify-end sm:ml-auto"
    >
      {activeTab === "deliveries" && businessId && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full"
                  disabled={!canWrite}
                  data-tutorial="import-xml-button"
                  onClick={() => setIsImportOpen(true)}
                >
                  <FileUp className="mr-1 h-4 w-4" />
                  Importar XML
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

      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData={REVALIDATE_TAG[activeTab]}
          rateLimit={{
            storageKey: RATE_LIMIT_KEY[activeTab],
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>

      {businessId && CREATE_LABEL[activeTab] !== "" && (
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
                  {CREATE_LABEL[activeTab]}
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

      {businessId && isCreateOpen && activeTab === "deliveries" && (
        <DeliveryFormDialog
          businessId={businessId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {businessId && isCreateOpen && activeTab === "shippers" && (
        <ShipperFormDialog
          businessId={businessId}
          shipper={null}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {businessId && isCreateOpen && activeTab === "occurrence-types" && (
        <OccurrenceTypeFormDialog
          businessId={businessId}
          occurrenceType={null}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {businessId && isImportOpen && (
        <ImportXmlDialog
          businessId={businessId}
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  );
};

export { DeliveriesPageActions };
