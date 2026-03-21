"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateAccountPayableForm } from "@/app/(protected)/_components/dashboard/dashboard-account-payable/dashboard-create-account-payable-form";

const AccountPayableActions = (): JSX.Element => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-account-payable"
          rateLimit={{
            storageKey: "dashboard-account-payable",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateAccountPayableForm />
      </div>
    </div>
  );
};

export { AccountPayableActions };
