"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateFuelForm } from "../../_components/dashboard/dashboard-fuel/dashboard-create-fuel-form";

import { ExportExcelButton } from "../../_components/custom/export-excel-button";
import { handleExportFuelExcel } from "@/actions/fuel/export-fuel-excel";

interface FuelActionsProps {
  hasData: boolean;
}

const FuelActions = ({ hasData }: FuelActionsProps) => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportExcelButton
          hasData={hasData}
          exportAction={handleExportFuelExcel}
          entityName="relatório de abastecimentos"
          buttonText="Exportar (Excel)"
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-fuel"
          rateLimit={{
            storageKey: "dashboard-fuel",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateFuelForm />
      </div>
    </div>
  );
};

export { FuelActions };
