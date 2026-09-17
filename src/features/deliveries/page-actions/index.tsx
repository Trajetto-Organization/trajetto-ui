"use client";

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  MoreHorizontal,
  Plus,
} from "lucide-react";

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
import { useExportButton } from "@/app/(protected)/_components/shared/custom/export-button/hooks";
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
  "proof-audits": "update-delivery",
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
  "proof-audits": "deliveries-proof-audits-panel",
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

  // Auditing a receipt is deciding about a delivery, on the same key.
  "proof-audits": permissions.DELIVERY_MANAGE,
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

  // A card appears when a driver proves a delivery. Nothing to create.
  "proof-audits": "",
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

  const exportAction = EXPORT_ACTION[activeTab];
  const entityName = activeTab === "occurrences" ? "ocorrencias" : "entregas";

  /**
   * The export handler, reached directly so the phone's overflow menu can
   * offer the same two formats the desk button does.
   *
   * A hook cannot be conditional, so a tab with nothing to export gets a stub
   * — and the menu never offers it, because `exportAction` is what decides
   * whether those items are rendered at all.
   */
  const { handleExport, isExporting } = useExportButton({
    exportAction: exportAction ?? (async () => ({ success: false })),
    entityName,
    writePermission: canWrite,
  });

  const canImport =
    (activeTab === "deliveries" || activeTab === "imports") &&
    Boolean(businessId);

  return (
    <div
      /**
       * One row on a phone, a wrapping bar from `sm` up.
       *
       * It used to stack every action full-width below `sm`: four buttons,
       * about 160px of vertical space, and the table began below the fold on
       * a 360px screen before a single delivery was visible. Exportar and
       * Importar are desk work — nobody maps a spreadsheet at a bus stop — so
       * on a phone they move into an overflow menu and the row carries what
       * is actually used there: refresh, and the one thing being created.
       *
       * From `sm` up, `flex-wrap` and `min-w-0` are load-bearing. `nowrap` is
       * the flex default, and the `sm:flex-nowrap` that used to be here hid
       * the problem: the buttons became a single row that neither wraps nor
       * shrinks, needing 505px where an iPad in portrait offers 400. Because
       * the shell clips, the rightmost buttons sat off-screen with no
       * scrollbar.
       */
      className="flex w-full min-w-0 items-center gap-2 sm:w-auto
      sm:flex-wrap sm:justify-end sm:ml-auto"
    >
      {exportAction && (
        <div className="hidden sm:block">
          <ExportButton
            exportAction={exportAction}
            entityName={entityName}
            hasData={hasData}
            writePermission={canWrite}
          />
        </div>
      )}

      {/* One menu instead of two buttons. The XML and the spreadsheet are two
          doors into the same room, and a bar with "Importar XML" next to
          "Importar Planilha" makes people stop and read instead of act. */}
      {canImport && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:block">
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

      <div className="shrink-0 sm:w-auto">
        <DataTableRevalidate
          revalidateData={REVALIDATE_TAG[activeTab]}
          hideLabelOnMobile
          className="h-9 w-9 p-0 sm:h-8 sm:w-full sm:px-3"
          rateLimit={{
            storageKey: RATE_LIMIT_KEY[activeTab],
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>

      {/*
        The phone's overflow. Flat rather than nested: a submenu is a bad
        target on touch, and four items is not a list worth folding.
      */}
      {(exportAction || canImport) && (
        <div className="shrink-0 sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-9 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Mais ações desta seção</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="min-w-[200px]">
              {exportAction && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!hasData || isExporting}
                    onSelect={() => void handleExport("csv")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!hasData || isExporting}
                    onSelect={() => void handleExport("excel")}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </DropdownMenuItem>
                </>
              )}

              {canImport && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!canWrite}
                    onSelect={() => setIsImportSpreadsheetOpen(true)}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Importar planilha
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!canWrite}
                    onSelect={() => setIsImportOpen(true)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Importar XML da NF-e
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {businessId && CREATE_LABEL[activeTab] !== "" && (
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
                  <span className="truncate">{CREATE_LABEL[activeTab]}</span>
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
