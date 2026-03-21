"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateVehicleChecklistForm } from "@/app/(protected)/_components/dashboard/dashboard-vehicle-checklist/dashboard-create-vehicle-checklist-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportVehicleChecklist } from "@/actions/vehicle-checklist/export-vehicle-checklist";

interface FuelActionsProps {
  hasData: boolean;
}

const VehicleChecklistActions = ({
  hasData,
}: FuelActionsProps): JSX.Element => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportButton
          hasData={hasData}
          exportAction={handleExportVehicleChecklist}
          entityName="relatório de checklist veicular"
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-vehicle-checklist"
          rateLimit={{
            storageKey: "dashboard-vehicle-checklist",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateVehicleChecklistForm />
      </div>
    </div>
  );
};

export { VehicleChecklistActions };
