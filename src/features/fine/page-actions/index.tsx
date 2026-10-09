"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

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
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import type { ExportFormat } from "@/app/(protected)/_components/shared/custom/export-button/export-button.types";

import { handleExportFine } from "@/actions/fine/export-fine";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { cn } from "@/lib/utils";

import { useFineBusinessId } from "../hooks/use-fine-business-id";
import { fineListQuery } from "../lib/server-table";
import type { FineScreenMode } from "../lib/types";

import { FineFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

interface FinePageActionsProps {
  mode: FineScreenMode;
  /** Whether the table has any row: exporting nothing is not offered. */
  hasData: boolean;
}

/**
 * Exportar, Atualizar and Nova Multa, one row for /admin and /dashboard.
 *
 * Decision 3.6: beside the company selector the buttons take its height,
 * and on a phone they stack full width with their labels. The export sends
 * the company on screen and the list's filters (decision 5.8): the /admin
 * copy exported every company at once whatever was selected. Nova Multa
 * stays visible without the permission and says why.
 */
const FinePageActions = ({
  mode,
  hasData,
}: FinePageActionsProps): JSX.Element => {
  const businessId = useFineBusinessId(mode);
  const searchParams = useSearchParams();
  const actionClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const canCreate = useCheckMultiplePermissions([
    {
      key: permissions.FINE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FINE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  // Exporting is a write (decision 4.2), like the API guard.
  const canExport = useCheckMultiplePermissions([
    {
      key: permissions.FINE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FINE_MANAGE),
    },
  ]);

  const exportFines = (search?: string, format?: ExportFormat) =>
    handleExportFine({
      search,
      format,
      businessId,
      filters: fineListQuery(Object.fromEntries(searchParams.entries())),
    });

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        exportAction={exportFines}
        entityName="relatório de multas"
        writePermission={canExport.hasAllPermissions}
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: `${mode}-fine`,
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      {businessId && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* The wrapper takes the pointer events a disabled button drops. */}
              <div>
                <Button
                  size="sm"
                  className={cn(actionClassName, "gap-1")}
                  disabled={!canCreate.hasAllPermissions}
                  data-tutorial="create-button"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <CreateButtonLabel>Nova Multa</CreateButtonLabel>
                </Button>
              </div>
            </TooltipTrigger>
            {!canCreate.hasAllPermissions && (
              <TooltipContent className="max-w-sm">
                <p>{canCreate.tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {isCreateOpen && businessId && (
        <FineFormDialog
          businessId={businessId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </PageActions>
  );
};

export { FinePageActions };
