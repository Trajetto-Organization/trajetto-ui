"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateDriverForm } from "@/app/(protected)/_components/dashboard/dashboard-driver/dashboard-create-driver-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportDriver } from "@/actions/driver/export-driver";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DriverActionsProps {
  hasData: boolean;
}

const DriverActions = ({ hasData }: DriverActionsProps): JSX.Element => {
  const hasUserPermission = useHasPermission(
    permissions.DRIVER_MANAGE,
    "write",
  );

  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportButton
          hasData={hasData}
          exportAction={handleExportDriver}
          entityName="relatório de motoristas"
          writePermission={hasUserPermission}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-driver"
          rateLimit={{
            storageKey: "dashboard-driver",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateDriverForm />
      </div>
    </div>
  );
};

export { DriverActions };
