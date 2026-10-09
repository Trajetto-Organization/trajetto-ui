/**
 * The route map's points (decision 14.7, §5.4), pure.
 *
 * The stops are numbered by the LOCAL order, so a drag shows on the map before
 * it is saved. Only deliveries with a point are drawn; the rest are counted as
 * "sem localização" and listed for "Fixar no mapa". The frame fits what has a
 * point — the planned stops, the visited GPS and the driver — and is null
 * when nothing has one (the map then shows Brazil with a notice).
 */

interface MapStopInput {
  id: string;
  status: string;
  delivery: {
    id: string;
    recipient_name: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

interface StopMarker {
  stopId: string;
  deliveryId: string;

  /** 1-based position in the order on screen. */
  position: number;
  status: string;
  label: string;
  latitude: number;
  longitude: number;
}

interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

const hasPoint = (value: {
  latitude?: number | null;
  longitude?: number | null;
}): value is { latitude: number; longitude: number } =>
  typeof value.latitude === "number" &&
  typeof value.longitude === "number" &&
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude);

/**
 * Markers in the order given (`orderedIds`, the local one); stops missing
 * from it keep their place at the end, in the order received.
 */
function stopMarkers(
  stops: readonly MapStopInput[],
  orderedIds: readonly string[],
): { markers: StopMarker[]; missing: MapStopInput[] } {
  const byId = new Map(stops.map((stop) => [stop.id, stop]));

  const ordered = [
    ...orderedIds
      .map((id) => byId.get(id))
      .filter((stop): stop is MapStopInput => !!stop),
    ...stops.filter((stop) => !orderedIds.includes(stop.id)),
  ];

  const markers: StopMarker[] = [];
  const missing: MapStopInput[] = [];

  ordered.forEach((stop, index) => {
    // A cancelled stop is not part of the plan the driver follows.
    if (stop.status === "CANCELLED") return;

    if (!hasPoint(stop.delivery)) {
      missing.push(stop);
      return;
    }

    markers.push({
      stopId: stop.id,
      deliveryId: stop.delivery.id,
      position: index + 1,
      status: stop.status,
      label: stop.delivery.recipient_name,
      latitude: stop.delivery.latitude,
      longitude: stop.delivery.longitude,
    });
  });

  return { markers, missing };
}

/** The box around every point given, or null when there is none. */
function mapBounds(
  points: ReadonlyArray<Partial<LatLng> | null | undefined>,
): MapBounds | null {
  const real = points.filter(
    (point): point is LatLng => !!point && hasPoint(point),
  );

  if (real.length === 0) return null;

  return real.reduce<MapBounds>(
    (box, point) => ({
      south: Math.min(box.south, point.latitude),
      west: Math.min(box.west, point.longitude),
      north: Math.max(box.north, point.latitude),
      east: Math.max(box.east, point.longitude),
    }),
    {
      south: real[0].latitude,
      west: real[0].longitude,
      north: real[0].latitude,
      east: real[0].longitude,
    },
  );
}

/** One colour per stop status, the badge's own palette. */
const STOP_MARKER_COLOUR: Record<string, string> = {
  PENDING: "#475569",
  ARRIVED: "#2563eb",
  COMPLETED: "#15803d",
  FAILED: "#dc2626",
  CANCELLED: "#9ca3af",
};

function stopMarkerColour(status: string): string {
  return STOP_MARKER_COLOUR[status] ?? STOP_MARKER_COLOUR.PENDING;
}

/** "3 entregas sem localização". */
function missingLocationLabel(count: number): string | null {
  if (count === 0) return null;

  return count === 1
    ? "1 entrega sem localização"
    : `${count} entregas sem localização`;
}

export {
  hasPoint,
  mapBounds,
  missingLocationLabel,
  stopMarkerColour,
  stopMarkers,
};
export type { MapBounds, MapStopInput, StopMarker };
