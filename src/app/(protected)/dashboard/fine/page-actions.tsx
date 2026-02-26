"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateFineForm } from "../../_components/dashboard/dashboard-fine/dashboard-create-fine-form";

import { ExportExcelButton } from "../../_components/custom/export-excel-button";
import { handleExportFineExcel } from "@/actions/fine/export-fine-excel";

interface FineActionsProps {
  hasData: boolean;
}

const FineActions = ({ hasData }: FineActionsProps) => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportExcelButton
          hasData={hasData}
          exportAction={handleExportFineExcel}
          entityName="relatório de multas"
          buttonText="Exportar (Excel)"
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-fine"
          rateLimit={{
            storageKey: "dashboard-fine",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateFineForm />
      </div>
    </div>
  );
};

export { FineActions };
