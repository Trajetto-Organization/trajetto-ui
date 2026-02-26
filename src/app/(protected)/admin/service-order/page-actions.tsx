"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { CreateServiceOrderForm } from "../../_components/admin/service-order/create-service-order-form";

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
            storageKey: "service-order",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateServiceOrderForm />
      </div>
    </div>
  );
};

export { ServiceOrderActions };
