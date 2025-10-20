"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { CreateBranchForm } from "../../_components/admin/branch/create-branch-form";

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
            storageKey: "branch",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateBranchForm />
      </div>
    </div>
  );
};

export { BranchActions };
