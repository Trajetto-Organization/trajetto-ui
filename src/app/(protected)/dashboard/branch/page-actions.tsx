"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateBranchForm } from "@/app/(protected)/_components/dashboard/dashboard-branch/dashboard-create-branch-form";

const BranchActions = (): JSX.Element => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
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
