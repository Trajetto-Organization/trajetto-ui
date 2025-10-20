"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { DashboardCreateBranchForm } from "../../_components/dashboard/dashboard-branch/dashboard-create-branch-form";

const BranchActions = () => {
  return (
    <div
      className="flex flex-col sm:flex-row
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-branch"
          rateLimit={{
            storageKey: "dashboard-branch",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateBranchForm />
      </div>
    </div>
  );
};

export { BranchActions };
