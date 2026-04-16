"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateServiceOrderForm } from "@/app/(protected)/_components/dashboard/dashboard-service-order/dashboard-create-service-order-form";

import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { handleExportServiceOrder } from "@/actions/service-order/export-service-order";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface ServiceOrderActionsProps {
  hasData: boolean;
}

const ServiceOrderActions = ({
  hasData,
}: ServiceOrderActionsProps): JSX.Element => {
  const hasUserPermission = useHasPermission(
    permissions.SERVICE_ORDER_MANAGE,
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
          exportAction={handleExportServiceOrder}
          entityName="relatório de ordens de serviço"
          writePermission={hasUserPermission}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-service-order"
          rateLimit={{
            storageKey: "dashboard-service-order",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateServiceOrderForm />
      </div>
    </div>
  );
};

export { ServiceOrderActions };
