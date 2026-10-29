"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText, FileUp } from "lucide-react";

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
import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";

import { permissions } from "@/lib/permissions";
import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import type { DeliveryTab } from "../lib/tabs";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import type { ExportFormat } from "@/app/(protected)/_components/shared/custom/export-button/export-button.types";

import { exportRequestFor } from "../lib/export-action";

// Each dialog is its own chunk, loaded on the first click (dialogs.tsx).
import {
  DeliveryFormDialog,
  ImportSpreadsheetDialog,
  ImportXmlDialog,
  OccurrenceTypeFormDialog,
  ShipperFormDialog,
  StatusChangeReasonFormDialog,
} from "./dialogs";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

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
 * Which tabs can leave as a file. Only the two that are lists of operational
 * records: a catalogue of six reasons is not a report, and an export button
 * over it would be a button nobody presses twice.
 */
const EXPORTABLE_TABS: ReadonlySet<DeliveryTab> = new Set([
  "deliveries",
  "occurrences",
]);

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

  const searchParams = useSearchParams();
  const actionClassName = usePageActionClassName();

  // The file follows the table on screen (decision 5.8): its search, its
  // facets and, on /admin, the company picked above — without which the API
  // cannot tell which company a MASTER means (DLV-EXP-1).
  const exportRequest = EXPORTABLE_TABS.has(activeTab)
    ? (search?: string, format?: ExportFormat) =>
        exportRequestFor(activeTab, { businessId, searchParams })(
          search,
          format,
        )
    : null;

  const entityName = activeTab === "occurrences" ? "ocorrências" : "entregas";

  const canImport =
    (activeTab === "deliveries" || activeTab === "imports") &&
    Boolean(businessId);

  return (
    // The page toolbar's row (decision 3.6): the page actions' height (h-9, decision 16.61) beside it
    // on /admin, and on a phone every action stacked full width with its
    // label — Atualizar included. No overflow menu.
    <PageActions>
      {exportRequest && (
        <ExportButton
          exportRequest={exportRequest}
          entityName={entityName}
          hasData={hasData}
          writePermission={canWrite}
        />
      )}

      {/* One menu instead of two buttons. The XML and the spreadsheet are two
          doors into the same room, and a bar with "Importar XML" next to
          "Importar Planilha" makes people stop and read instead of act. */}
      {canImport && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionClassName}
                      disabled={!canWrite}
                      data-tutorial="import-xml-button"
                    >
                      <FileUp aria-hidden="true" className="h-4 w-4 shrink-0" />
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

      {/* Atualizar refreshes the whole tab (useRevalidateScreen, decision
          2.1); its default class is the toolbar's height at full width. */}
      <DataTableRevalidate
        rateLimit={{
          storageKey: RATE_LIMIT_KEY[activeTab],
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      {businessId && CREATE_LABEL[activeTab] !== "" && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* The wrapper is load-bearing: a disabled button fires no
                  pointer events, so the tooltip anchors to the div. */}
              <div>
                <Button
                  size="sm"
                  className={actionClassName}
                  disabled={!canWrite}
                  data-tutorial="create-button"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <CreateButtonLabel>
                    {CREATE_LABEL[activeTab]}
                  </CreateButtonLabel>
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
    </PageActions>
  );
};

export { DeliveriesPageActions };
