"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateFineForm } from "@/app/(protected)/_components/dashboard/dashboard-fine/dashboard-create-fine-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportFine } from "@/actions/fine/export-fine";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface FineActionsProps {
  hasData: boolean;
}

const FineActions = ({ hasData }: FineActionsProps): JSX.Element => {
  const hasUserPermission = useHasPermission(permissions.FINE_MANAGE, "write");

  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <ExportButton
          hasData={hasData}
          exportAction={handleExportFine}
          entityName="relatório de multas"
          writePermission={hasUserPermission}
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
