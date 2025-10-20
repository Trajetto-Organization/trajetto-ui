"use client";

import { DataTableRevalidate } from "../../_components/tanstack-table/data-table-revalidate";
import { CreateVehicleChecklistForm } from "../../_components/admin/vehicle-checklist/create-vehicle-checklist-form";

const VehicleChecklistActions = () => {
  return (
    <div
      className="flex flex-col sm:flex-row 
      items-stretch sm:items-center gap-3 
      sm:gap-2 justify-end mt-6 mb-6"
    >
      <div className="w-full sm:w-auto">
        <DataTableRevalidate
          revalidateData="update-vehicle-checklist"
          rateLimit={{
            storageKey: "vehicle-checklist",
            maxClicks: 3,
            timeWindowMs: 30000,
            cooldownTimeMs: 15000,
          }}
        />
      </div>
      <div className="w-full sm:w-auto">
        <CreateVehicleChecklistForm />
      </div>
    </div>
  );
};

export { VehicleChecklistActions };
