"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { CreateVehicleForm } from "@/app/(protected)/_components/admin/vehicle/create-vehicle-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportVehicle } from "@/actions/vehicle/export-vehicle";

interface VehicleActionsProps {
  hasData: boolean;
}

const VehicleActions = ({ hasData }: VehicleActionsProps): JSX.Element => {
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
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-vehicle"
          rateLimit={{
            storageKey: "vehicle",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateVehicleForm />
      </div>
    </div>
  );
};

export { VehicleActions };
