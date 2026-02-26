"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateServiceOrderPartForm } from "../../_components/dashboard/dashboard-service-order-part/dashboard-create-service-order-part-form";

const ServiceOrderPartActions = () => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-service-order-part"
          rateLimit={{
            storageKey: "dashboard-service-order-part",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateServiceOrderPartForm />
      </div>
    </div>
  );
};

export { ServiceOrderPartActions };
