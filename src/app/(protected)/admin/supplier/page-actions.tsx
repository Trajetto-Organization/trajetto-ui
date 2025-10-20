"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { CreateSupplierForm } from "../../_components/admin/supplier/create-supplier-form";

const SupplierActions = () => {
  return (
    <div
      className="flex flex-col sm:flex-row 
      items-stretch sm:items-center gap-3 
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-supplier"
          rateLimit={{
            storageKey: "supplier",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateSupplierForm />
      </div>
    </div>
  );
};

export { SupplierActions };
