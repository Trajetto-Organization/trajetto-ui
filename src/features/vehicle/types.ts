import type { FacetCount } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { VehicleStatus } from "@/lib/vehicle-status";

/** Where a vehicle screen is: the master's /admin or the company's /dashboard. */
type VehicleScreenMode = "admin" | "dashboard";

/** One line of GET /vehicle/list-vehicle. */
interface VehicleRow {
  id: string;
  description: string;
  license_plate: string;
  brand: string;
  model: string;
  acquisition_date: string;
  fleet_type: "OWNED" | "THIRD_PARTY";
  fleet_id: string | null;
  last_maintenance_date: string | null;
  current_mileage: number;
  last_maintenance_mileage: number | null;
  maintenance_interval_km: number;
  maintenance_interval_months: number;
  renavam: string;
  manufacturing_year: string;
  model_year: string;
  km_per_liter: number;
  number_of_axles: number;
  status: VehicleStatus;
  vehicleTypeId: string | null;
  fuelTypeId: string;
  driverId: string | null;
  branchId: string | null;
  businessId: string;
  created_at: string;
  updated_at: string;
  vehicleType?: { description: string } | null;
  fuelType?: { description: string } | null;
  driver?: { name: string; cnh: string } | null;
  branch?: { corporate_reason: string } | null;
}

type VehicleStatusCounts = Record<VehicleStatus, number>;

/** The listing's `meta.searchMeta`, as the API streams it. */
interface VehicleListSearchMeta {
  /** Every filter but the status one: the base of the four cards. */
  total?: number;
  statusCounts?: VehicleStatusCounts;
  facets?: {
    status?: FacetCount[];
    branchId?: FacetCount[];
  };
}

interface VehicleListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: VehicleListSearchMeta;
}

export type {
  VehicleListMeta,
  VehicleListSearchMeta,
  VehicleRow,
  VehicleScreenMode,
  VehicleStatusCounts,
};
