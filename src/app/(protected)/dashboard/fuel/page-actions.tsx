"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateFuelForm } from "@/app/(protected)/_components/dashboard/dashboard-fuel/dashboard-create-fuel-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportFuel } from "@/actions/fuel/export-fuel";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface FuelActionsProps {
  hasData: boolean;
}

const FuelActions = ({ hasData }: FuelActionsProps) => {
  const hasUserPermission = useHasPermission(permissions.FUEL_MANAGE, "write");

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
          writePermission={hasUserPermission}
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
