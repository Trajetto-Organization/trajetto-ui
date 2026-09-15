interface Positioned {
  latitude: number;
  longitude: number;
}

interface Cluster<T extends Positioned> {
  latitude: number;
  longitude: number;

  items: T[];
}

/**
 * Collapses markers that would land on top of each other.
 *
 * Not because a carrier has thousands of trucks — most have tens — but because
 * at seven in the morning every one of them is in the same yard, and a map
 * that draws twelve markers at the same coordinates shows one marker and hides
 * eleven trucks. The dispatcher counts eleven missing and calls somebody.
 *
 * Grid-based rather than hierarchical, and in SCREEN space rather than in
 * metres: the question is "would these overlap at the zoom I am looking at",
 * which is a question about pixels. Two trucks a kilometre apart overlap at
 * zoom 8 and do not at zoom 16, and a clusterer that used a fixed radius in
 * metres would be wrong at one end or the other.
 *
 * Written here rather than pulled in as `leaflet.markercluster`: a dependency
 * with its own CSS, its own DOM and its own animation, to solve a problem that
 * is thirty lines when the input is thirty points.
 */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const TILE_SIZE = 256;

/**
 * How close, in pixels, two markers have to be to collapse.
 *
 * Sixty is a little wider than a marker with its label, which is the point:
 * two markers that merely touch are still two readable markers, and clustering
 * them would hide a truck for no reason.
 */
const CLUSTER_RADIUS_PX = 60;

/** Metres per pixel at a given latitude and zoom, for the Web Mercator grid. */
function metresPerPixel(latitude: number, zoom: number): number {
  return (
    (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) /
    (TILE_SIZE * 2 ** zoom)
  );
}

function clusterPositions<T extends Positioned>(
  items: T[],
  zoom: number,
): Cluster<T>[] {
  if (items.length === 0) return [];

  // The scale is taken from the first point rather than per point: a company's
  // fleet is inside one city, and a per-point scale would make the grid
  // non-uniform for no gain anybody can see.
  const scale = metresPerPixel(items[0].latitude, zoom);

  // Degrees that correspond to the cluster radius at this zoom. Longitude is
  // divided by cos(lat) because a degree of longitude is shorter away from the
  // equator — without it, clusters at -23° would be a third too wide.
  const metres = CLUSTER_RADIUS_PX * scale;

  const latStep = metres / 111_320;
  const lonStep =
    latStep / Math.max(0.01, Math.cos((items[0].latitude * Math.PI) / 180));

  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const key = [
      Math.floor(item.latitude / latStep),
      Math.floor(item.longitude / lonStep),
    ].join(":");

    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }

  return [...buckets.values()].map((group) => ({
    // The centroid, so a cluster sits among its trucks rather than on the
    // corner of a grid cell nobody can see.
    latitude:
      group.reduce((sum, item) => sum + item.latitude, 0) / group.length,
    longitude:
      group.reduce((sum, item) => sum + item.longitude, 0) / group.length,

    items: group,
  }));
}

/**
 * The box that holds every marker, for the initial fit.
 *
 * Null for an empty fleet: a bounding box of nothing is not the whole world,
 * and fitting to it would open the map on the Atlantic.
 */
function boundsOf(items: Positioned[]): {
  south: number;
  west: number;
  north: number;
  east: number;
} | null {
  if (items.length === 0) return null;

  return items.reduce(
    (box, item) => ({
      south: Math.min(box.south, item.latitude),
      west: Math.min(box.west, item.longitude),
      north: Math.max(box.north, item.latitude),
      east: Math.max(box.east, item.longitude),
    }),
    {
      south: items[0].latitude,
      west: items[0].longitude,
      north: items[0].latitude,
      east: items[0].longitude,
    },
  );
}

export {
  CLUSTER_RADIUS_PX,
  boundsOf,
  clusterPositions,
  metresPerPixel,
  type Cluster,
  type Positioned,
};
