import type { CatalogLeader } from "@/lib/catalog-stats";

/** A fuel type row as GET /fuel-type/list-fuel-type streams it. */
interface FuelTypeRow {
  id: string;
  description: string;
  businessId: string;
  created_at: Date | string;
  updated_at: Date | string;
}

/** This business month's refuelings of the types found (fuel-type-list.ts). */
interface FuelTypeMonthStats {
  /** "YYYY-MM", the company's own month. */
  month: string;
  refuelings: number;
  liters: number;
  amount: number;
  mostRefueled: {
    id: string;
    label: string;
    refuelings: number;
    liters: number;
    averagePricePerLiter: number;
  } | null;
}

/**
 * The cards' numbers (`meta.searchMeta`), counted by the API over the
 * company's whole search: fuel-type-list.ts summarizeFuelTypeList. `month`
 * is null when the company has no Gestão de Frotas or the profile does not
 * read Abastecimentos.
 */
interface FuelTypeListSearchMeta {
  total: number;
  vehicles: number;
  withoutVehicles: number;
  mostUsed: CatalogLeader | null;
  month: FuelTypeMonthStats | null;
}

interface FuelTypeListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: FuelTypeListSearchMeta;
}

export type {
  FuelTypeListMeta,
  FuelTypeListSearchMeta,
  FuelTypeMonthStats,
  FuelTypeRow,
};
