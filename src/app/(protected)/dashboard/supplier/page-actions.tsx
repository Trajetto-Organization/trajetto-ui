"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateSupplierForm } from "../../_components/dashboard/dashboard-supplier/dashboard-create-supplier-form";

const SupplierActions = () => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-supplier"
          rateLimit={{
            storageKey: "dashboard-supplier",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateSupplierForm />
      </div>
    </div>
  );
};

export { SupplierActions };
