import type { CatalogLeader } from "@/lib/catalog-stats";
import type { CnhCategory } from "@/schemas/create-update-vehicle-type-schema";

/** One line of GET /vehicle-type/list-vehicle-type. */
interface VehicleTypeRow {
  id: string;
  description: string;
  number_of_axles: number;
  required_cnh_category: CnhCategory | null;
  businessId: string;
  created_at: string;
  updated_at: string;
  /** Vehicles registered with this type; deleting is refused while > 0. */
  _count?: { vehicles: number };
}

/**
 * The cards' numbers (`meta.searchMeta`), counted by the API over the
 * company's whole search: vehicle-type-list.ts summarizeVehicleTypeList.
 */
interface VehicleTypeListSearchMeta {
  total: number;
  vehicles: number;
  withoutVehicles: number;
  mostUsed: CatalogLeader | null;
}

interface VehicleTypeListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: VehicleTypeListSearchMeta;
}

export type { VehicleTypeListMeta, VehicleTypeListSearchMeta, VehicleTypeRow };
