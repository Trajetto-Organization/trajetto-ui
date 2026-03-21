"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { CreateFuelForm } from "@/app/(protected)/_components/admin/fuel/create-fuel-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportFuel } from "@/actions/fuel/export-fuel";

interface FuelActionsProps {
  hasData: boolean;
}

const FuelActions = ({ hasData }: FuelActionsProps): JSX.Element => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportButton
          hasData={hasData}
          exportAction={handleExportFuel}
          entityName="relatório de abastecimentos"
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-fuel"
          rateLimit={{
            storageKey: "fuel",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateFuelForm />
      </div>
    </div>
  );
};

export { FuelActions };
