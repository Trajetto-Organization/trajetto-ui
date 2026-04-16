"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateVehicleForm } from "@/app/(protected)/_components/dashboard/dashboard-vehicle/dashboard-create-vehicle-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportVehicle } from "@/actions/vehicle/export-vehicle";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface VehicleActionsProps {
  hasData: boolean;
}

const VehicleActions = ({ hasData }: VehicleActionsProps): JSX.Element => {
  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_MANAGE,
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
          exportAction={handleExportVehicle}
          entityName="relatório de veículos"
          writePermission={hasUserPermission}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-vehicle"
          rateLimit={{
            storageKey: "dashboard-vehicle",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateVehicleForm />
      </div>
    </div>
  );
};

export { VehicleActions };
