"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { CreateDriverForm } from "@/app/(protected)/_components/admin/driver/create-driver-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportDriver } from "@/actions/driver/export-driver";

interface DriverActionsProps {
  hasData: boolean;
}

const DriverActions = ({ hasData }: DriverActionsProps): JSX.Element => {
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
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-driver"
          rateLimit={{
            storageKey: "driver",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateDriverForm />
      </div>
    </div>
  );
};

export { DriverActions };
