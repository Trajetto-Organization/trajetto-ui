import type { VehicleStatus } from "@/lib/vehicle-status";
import { formatPickedDay } from "./picked-day";

/**
 * How a vehicle's values read on screen: one place for the badge colours and
 * the number formats the table and the details share. No directive: pure.
 */
const VEHICLE_STATUS_BADGE: Record<VehicleStatus, string> = {
  ACTIVE:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  INACTIVE:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  BLOCKED:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  IN_ROUTE:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
};

const FLEET_TYPE_LABELS = {
  OWNED: "Própria",
  THIRD_PARTY: "Terceirizada",
} as const;

/** "120.000 km"; null reads as nothing, not as zero. */
function formatKm(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/** "2,5 km/l" — fractional since decision 8.6. */
function formatKmPerLiter(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km/l`;
}

/** A stored year (1 January, UTC) as the year alone. */
function formatYear(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear());
}

export {
  FLEET_TYPE_LABELS,
  formatPickedDay,
  VEHICLE_STATUS_BADGE,
  formatKm,
  formatKmPerLiter,
  formatYear,
};
