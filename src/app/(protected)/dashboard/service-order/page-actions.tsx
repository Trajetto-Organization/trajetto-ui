"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateServiceOrderForm } from "../../_components/dashboard/dashboard-service-order/dashboard-create-service-order-form";

const ServiceOrderActions = () => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
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
