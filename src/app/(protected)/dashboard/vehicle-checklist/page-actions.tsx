"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateVehicleChecklistForm } from "../../_components/dashboard/dashboard-vehicle-checklist/dashboard-create-vehicle-checklist-form";

import { ExportExcelButton } from "../../_components/custom/export-excel-button";
import { handleExportVehicleChecklistExcel } from "@/actions/vehicle-checklist/export-vehicle-checklist-excel";

interface FuelActionsProps {
  hasData: boolean;
}

const VehicleChecklistActions = ({ hasData }: FuelActionsProps) => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportExcelButton
          hasData={hasData}
          exportAction={handleExportVehicleChecklistExcel}
          entityName="relatório de checklist veicular"
          buttonText="Exportar (Excel)"
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
