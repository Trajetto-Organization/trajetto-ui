"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { CreateAccountPayableForm } from "../../_components/admin/account-payable/create-account-payable-form";

const AccountPayableActions = () => {
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
            storageKey: "account-payable",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateAccountPayableForm />
      </div>
    </div>
  );
};

export { AccountPayableActions };
