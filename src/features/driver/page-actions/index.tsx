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

import { handleExportDriver } from "@/actions/driver/export-driver";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDriverBusinessId } from "../hooks/use-driver-business-id";
import type { DriverScope } from "../lib/driver-rules";
import { driverListQuery } from "../server-table";
import { DriverFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

interface DriverPageActionsProps {
  mode: DriverScope;
  /** Whether the list has anything to export under the current filter. */
  hasData: boolean;
}

/**
 * Exportar, Atualizar and Criar, in the page toolbar (decision 3.6):
 * h-9 on /admin and /dashboard (decision 16.61), stacked full width with their
 * labels on a phone. Creating without the permission stays visible and says
 * why it is disabled.
 */
const DriverPageActions = ({
  mode,
  hasData,
}: DriverPageActionsProps): JSX.Element => {
  const businessId = useDriverBusinessId(mode);
  const searchParams = useSearchParams();
  const actionClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const writePermission = useCheckMultiplePermissions([
    {
      key: permissions.DRIVER_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const canWrite = writePermission.hasAllPermissions;

  // The file follows the list on screen (decision 5.8): same search, filters
  // and order, and on /admin the company picked above.
  const exportDrivers = (search?: string, format?: "csv" | "excel") =>
    handleExportDriver(search, format, {
      ...driverListQuery(searchParams),
      ...(mode === "admin" && businessId && { businessId }),
    });

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        exportAction={exportDrivers}
        entityName="relatório de motoristas"
        writePermission={canWrite}
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: `${mode}-driver`,
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* The wrapper is load-bearing: a disabled button fires no
                pointer events, so the tooltip anchors to the div. */}
            <div>
              <Button
                size="sm"
                className={actionClassName}
                disabled={!canWrite || !businessId}
                data-tutorial="create-button"
                onClick={() => setIsCreateOpen(true)}
              >
                <CreateButtonLabel>Criar Motorista</CreateButtonLabel>
              </Button>
            </div>
          </TooltipTrigger>
          {!canWrite && (
            <TooltipContent className="max-w-sm">
              <p>{writePermission.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {isCreateOpen && businessId && (
        <DriverFormDialog
          businessId={businessId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </PageActions>
  );
};

export { DriverPageActions };
