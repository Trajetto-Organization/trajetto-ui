"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, FileUp, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import type {
  ExportActionResponse,
  ExportFormat,
} from "@/app/(protected)/_components/shared/custom/export-button/export-button.types";

import { handleExportDelivery } from "@/actions/delivery/export-delivery";
import { handleExportOccurrence } from "@/actions/delivery/export-occurrence";

import { DeliveryFormDialog } from "../deliveries/form-dialog";
import { ImportXmlDialog } from "../deliveries/import-xml-dialog";

import { ImportSpreadsheetDialog } from "../deliveries/import-spreadsheet-dialog";
import { StatusChangeReasonFormDialog } from "../status-change-reasons/form-dialog";

import { ShipperFormDialog } from "../shippers/form-dialog";
import { OccurrenceTypeFormDialog } from "../occurrence-types/form-dialog";

interface DeliveriesPageActionsProps {
  activeTab: DeliveryTab;

  /**
   * Whether the table behind the bar has any row.
   *
   * The export button reads it: offering "Exportar" over an empty table hands
   * the operator a file with a header and nothing under it, and they open it
   * before they realise the filter was the problem.
   */
  hasData?: boolean;
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
  "status-change-reasons": "update-status-change-reason",
  imports: "update-import",

  // The panel keeps its own react-query cache and refetches itself
  // after a save; the tag exists so the shared refresh button has
  // something to name.
  "message-templates": "update-delivery",
};

const RATE_LIMIT_KEY: Record<DeliveryTab, string> = {
  deliveries: "deliveries-table",
  occurrences: "deliveries-occurrences-table",
  monitoring: "deliveries-monitoring-panel",
  chat: "deliveries-chat-panel",
  shippers: "deliveries-shippers-table",
  "occurrence-types": "deliveries-occurrence-types-table",
  "status-change-reasons": "deliveries-status-change-reasons-table",
  imports: "deliveries-imports-table",
  "message-templates": "deliveries-message-templates-panel",
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

  // The catalogue exists only to explain a delivery, so it rides on the same
  // key the deliveries do — exactly like the API guard.
  "status-change-reasons": permissions.DELIVERY_MANAGE,

  // An upload creates deliveries: whoever may not create one by hand may not
  // create two hundred from a file.
  imports: permissions.DELIVERY_MANAGE,

  // Writing what the company says to its own customers is the
  // dispatcher's, on the same key everything else about a delivery is.
  "message-templates": permissions.DELIVERY_MANAGE,
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
  "status-change-reasons": "Novo Motivo",

  // The imports tab is a record of what was uploaded — the way to add one is
  // the Importar button, not a generic create dialog.
  imports: "",

  // Six fixed slots, written in place. There is nothing to create.
  "message-templates": "",
};

/**
 * Which tabs can leave as a file, and through which action.
 *
 * Only the two that are lists of operational records. A catalogue of six
 * reasons is not a report, and an export button over it would be a button
 * nobody presses twice.
 */
const EXPORT_ACTION: Partial<
  Record<
    DeliveryTab,
    (search?: string, format?: ExportFormat) => Promise<ExportActionResponse>
  >
> = {
  deliveries: handleExportDelivery,
  occurrences: handleExportOccurrence,
};

const DeliveriesPageActions = ({
  activeTab,
  hasData = false,
}: DeliveriesPageActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const [isImportSpreadsheetOpen, setIsImportSpreadsheetOpen] =
    useState<boolean>(false);

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
      {EXPORT_ACTION[activeTab] && (
        <div className="w-full sm:w-auto">
          <ExportButton
            exportAction={EXPORT_ACTION[activeTab]!}
            entityName={
              activeTab === "occurrences" ? "ocorrencias" : "entregas"
            }
            hasData={hasData}
            writePermission={canWrite}
          />
        </div>
      )}

      {/* One menu instead of two buttons. The XML and the spreadsheet are two
          doors into the same room, and a bar with "Importar XML" next to
          "Importar Planilha" makes people stop and read instead of act. */}
      {(activeTab === "deliveries" || activeTab === "imports") && businessId && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-full"
                      disabled={!canWrite}
                      data-tutorial="import-xml-button"
                    >
                      <FileUp className="mr-1 h-4 w-4" />
                      Importar
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setIsImportSpreadsheetOpen(true)}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Planilha (.xlsx ou .csv)
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setIsImportOpen(true)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      XML da NF-e
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

      {businessId && isCreateOpen && activeTab === "status-change-reasons" && (
        <StatusChangeReasonFormDialog
          businessId={businessId}
          reason={null}
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

      {businessId && isImportSpreadsheetOpen && (
        <ImportSpreadsheetDialog
          businessId={businessId}
          isOpen={isImportSpreadsheetOpen}
          onClose={() => setIsImportSpreadsheetOpen(false)}
        />
      )}
    </div>
  );
};

export { DeliveriesPageActions };
