// The truck and cluster markup lives in vehicle-marker.ts, and the status a
// cluster shows in clusterStatus (lib/vehicle-motion.ts).

/** A plate, a name, or how many trucks a cluster holds. */
export function markerLabel(
  items: ReadonlyArray<{
    vehiclePlate: string | null;
    driverName: string | null;
  }>,
): string {
  if (items.length !== 1) return String(items.length);

  return items[0].vehiclePlate ?? items[0].driverName ?? "—";
}
