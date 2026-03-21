"use client";

import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { DashboardCreateUserForm } from "@/app/(protected)/_components/dashboard/dashboard-user/dashboard-create-user-form";

const UserRegistrationActions = (): JSX.Element => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap
      items-stretch sm:items-center gap-3
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-user-registration"
          rateLimit={{
            storageKey: "dashboard-user-registration",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <DashboardCreateUserForm />
      </div>
    </div>
  );
};

export { UserRegistrationActions };
