import { test, expect } from "@playwright/test";

import {
  CLUSTER_RADIUS_PX,
  boundsOf,
  clusterPositions,
  metresPerPixel,
} from "../../src/features/control-tower/lib/cluster";

const DEPOT = { latitude: -23.55, longitude: -46.63 };

/** A point offset from the depot by a rough number of metres. */
function near(metresNorth: number, metresEast: number) {
  const latDelta = metresNorth / 111_320;
  const lonDelta =
    metresEast / (111_320 * Math.cos((DEPOT.latitude * Math.PI) / 180));

  return {
    latitude: DEPOT.latitude + latDelta,
    longitude: DEPOT.longitude + lonDelta,
  };
}

/**
 * At seven in the morning every truck of a carrier is in the same yard.
 *
 * A map that draws twelve markers at the same coordinates shows ONE marker and
 * hides eleven trucks — and the dispatcher counts eleven missing and starts
 * calling people. That is the problem clustering solves here; the fleet is
 * tens of vehicles, not thousands, so the answer is thirty lines rather than a
 * dependency with its own CSS and its own animations.
 */
test.describe("trucks parked in the same yard", () => {
  test("collapses into one marker", () => {
    const fleet = [near(0, 0), near(5, 5), near(-5, 10), near(8, -3)];

    // Street zoom: four trucks within ten metres are one pin.
    const clusters = clusterPositions(fleet, 16);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].items).toHaveLength(4);
  });

  test("puts the pin among the trucks, not on a grid corner", () => {
    const clusters = clusterPositions([near(0, 0), near(100, 0)], 13);

    expect(clusters).toHaveLength(1);

    // The centroid. A pin on the corner of an invisible grid cell would sit
    // somewhere nobody can explain.
    expect(clusters[0].latitude).toBeCloseTo(
      (near(0, 0).latitude + near(100, 0).latitude) / 2,
      6,
    );
  });

  test("comes apart as somebody zooms in", () => {
    const fleet = [near(0, 0), near(600, 0)];

    // Six hundred metres apart: one pin from far away, two from close up.
    // A clusterer with a fixed radius in metres would be wrong at one end.
    expect(clusterPositions(fleet, 11)).toHaveLength(1);
    expect(clusterPositions(fleet, 17)).toHaveLength(2);
  });

  test("never loses a truck", () => {
    const fleet = Array.from({ length: 37 }, (_, index) =>
      near(index * 40, index * 17),
    );

    for (const zoom of [8, 11, 14, 17]) {
      const clustered = clusterPositions(fleet, zoom);

      const total = clustered.reduce(
        (sum, cluster) => sum + cluster.items.length,
        0,
      );

      // The one assertion that matters. A cluster that dropped a point would
      // hide a truck, which is the exact failure this exists to prevent.
      expect(total, `zoom ${zoom}`).toBe(fleet.length);
    }
  });

  test("answers nothing for an empty fleet", () => {
    expect(clusterPositions([], 14)).toEqual([]);
  });
});

test.describe("the pixel scale the grid is built on", () => {
  test("halves with every zoom level", () => {
    const far = metresPerPixel(DEPOT.latitude, 10);
    const near_ = metresPerPixel(DEPOT.latitude, 11);

    expect(near_).toBeCloseTo(far / 2, 6);
  });

  test("shrinks away from the equator", () => {
    // A degree of longitude is shorter at -23° than at 0°, and a grid that
    // ignored it would make southern clusters a third too wide.
    expect(metresPerPixel(-23.55, 14)).toBeLessThan(metresPerPixel(0, 14));
  });

  test("keeps the cluster radius a readable distance apart", () => {
    // Sixty pixels is a little wider than a marker with its label: two markers
    // that merely touch are still two readable markers, and clustering them
    // would hide a truck for no reason.
    expect(CLUSTER_RADIUS_PX).toBeGreaterThan(40);
    expect(CLUSTER_RADIUS_PX).toBeLessThan(120);
  });
});

test.describe("framing the map on the fleet", () => {
  test("wraps every truck", () => {
    const box = boundsOf([near(0, 0), near(1000, 500), near(-400, -900)]);

    expect(box).not.toBeNull();

    expect(box!.south).toBeLessThan(box!.north);
    expect(box!.west).toBeLessThan(box!.east);

    expect(box!.north).toBeCloseTo(near(1000, 500).latitude, 6);
    expect(box!.south).toBeCloseTo(near(-400, -900).latitude, 6);
  });

  test("refuses to frame nothing", () => {
    // A bounding box of nothing is not the whole world, and fitting to it
    // would open the map on the Atlantic.
    expect(boundsOf([])).toBeNull();
  });

  test("handles a single truck without collapsing", () => {
    const box = boundsOf([near(0, 0)]);

    expect(box).toEqual({
      south: DEPOT.latitude,
      north: DEPOT.latitude,
      west: DEPOT.longitude,
      east: DEPOT.longitude,
    });
  });
});
