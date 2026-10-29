import { describe, expect, it } from "vitest";

import {
  DEFAULT_MOTION_MS,
  MAX_MOTION_MS,
  MIN_MOTION_MS,
  bearingDegrees,
  distanceMetres,
  easeInOutCubic,
  interpolatePosition,
  motionDuration,
  normalizeAngle,
  resolveHeading,
  sampleMotion,
  shortestAngleTarget,
  shouldTeleport,
  vehicleStatus,
} from "@/features/control-tower/lib/vehicle-motion";

/**
 * The pure rules behind the tower's moving trucks: where a truck points, how
 * it turns, and where it is drawn between two reports.
 */
const DEPOT = { latitude: -23.55, longitude: -46.63 };

/** A point offset from the depot by a rough number of metres. */
function near(metresNorth: number, metresEast: number) {
  return {
    latitude: DEPOT.latitude + metresNorth / 111_320,
    longitude:
      DEPOT.longitude +
      metresEast / (111_320 * Math.cos((DEPOT.latitude * Math.PI) / 180)),
  };
}

describe("bearingDegrees", () => {
  it.each([
    ["north", near(100, 0), 0],
    ["east", near(0, 100), 90],
    ["south", near(-100, 0), 180],
    ["west", near(0, -100), 270],
    ["north-east", near(100, 100), 45],
  ])("points %s", (_label, to, expected) => {
    expect(bearingDegrees(DEPOT, to)).toBeCloseTo(expected, 0);
  });

  it("always answers within [0, 360)", () => {
    const bearing = bearingDegrees(DEPOT, near(100, -1));

    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe("distanceMetres", () => {
  it("measures street distances within a few metres", () => {
    // near() is a flat approximation; the haversine is the reference.
    expect(Math.abs(distanceMetres(DEPOT, near(300, 400)) - 500)).toBeLessThan(
      2,
    );
  });
});

describe("normalizeAngle", () => {
  it.each([
    [370, 10],
    [-10, 350],
    [720, 0],
    [180, 180],
  ])("%s° is %s°", (input, expected) => {
    expect(normalizeAngle(input)).toBe(expected);
  });
});

describe("shortestAngleTarget", () => {
  it("turns 20° right from 350° to 10°, not 340° left", () => {
    expect(shortestAngleTarget(350, 10)).toBe(370);
  });

  it("turns 20° left from 10° to 350°", () => {
    expect(shortestAngleTarget(10, 350)).toBe(-10);
  });

  it("keeps the drawn angle unwrapped after several turns", () => {
    // Drawn at 730° (two turns plus 10°): heading 20° is 10° further.
    expect(shortestAngleTarget(730, 20)).toBe(740);
  });

  it("never turns more than half a circle", () => {
    for (let from = -720; from <= 720; from += 37) {
      for (let to = 0; to < 360; to += 23) {
        const target = shortestAngleTarget(from, to);

        expect(Math.abs(target - from)).toBeLessThanOrEqual(180);
        expect(normalizeAngle(target)).toBeCloseTo(to, 6);
      }
    }
  });
});

describe("resolveHeading", () => {
  it("uses the phone's heading when it sends one", () => {
    expect(
      resolveHeading({
        heading: 135,
        previous: DEPOT,
        next: near(0, 100),
        fallback: 0,
      }),
    ).toBe(135);
  });

  it("falls back to the bearing between the last two points", () => {
    const heading = resolveHeading({
      heading: null,
      previous: DEPOT,
      next: near(0, 100),
      fallback: 0,
    });

    expect(heading).toBeCloseTo(90, 0);
  });

  it("treats the -1 an Android phone sends as no heading", () => {
    const heading = resolveHeading({
      heading: -1,
      previous: DEPOT,
      next: near(-100, 0),
      fallback: 0,
    });

    expect(heading).toBeCloseTo(180, 0);
  });

  it("keeps the previous heading when the truck only jittered in place", () => {
    expect(
      resolveHeading({
        heading: null,
        previous: DEPOT,
        next: near(2, 1),
        fallback: 42,
      }),
    ).toBe(42);
  });

  it("keeps the previous heading for the first point with no heading", () => {
    expect(
      resolveHeading({
        heading: null,
        previous: null,
        next: DEPOT,
        fallback: 7,
      }),
    ).toBe(7);
  });
});

describe("easeInOutCubic and interpolatePosition", () => {
  it("starts and ends exactly, and is half way at the middle", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("is clamped outside [0, 1]", () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });

  it("moves slowly at the ends and quickly in the middle", () => {
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });

  it("interpolates a point between two", () => {
    const to = near(100, 100);
    const middle = interpolatePosition(DEPOT, to, 0.5);

    expect(middle.latitude).toBeCloseTo((DEPOT.latitude + to.latitude) / 2, 10);
    expect(middle.longitude).toBeCloseTo(
      (DEPOT.longitude + to.longitude) / 2,
      10,
    );
  });
});

describe("motionDuration", () => {
  it("lasts about the time between the two reports", () => {
    expect(
      motionDuration("2026-10-08T12:00:00.000Z", "2026-10-08T12:00:05.000Z"),
    ).toBe(5_000);
  });

  it("is clamped: never a jerk, never a lagging truck", () => {
    expect(
      motionDuration("2026-10-08T12:00:00.000Z", "2026-10-08T12:00:00.100Z"),
    ).toBe(MIN_MOTION_MS);
    expect(
      motionDuration("2026-10-08T12:00:00.000Z", "2026-10-08T12:05:00.000Z"),
    ).toBe(MAX_MOTION_MS);
  });

  it("uses a default when the times are unknown or out of order", () => {
    expect(motionDuration(null, "2026-10-08T12:00:05.000Z")).toBe(
      DEFAULT_MOTION_MS,
    );
    expect(
      motionDuration("2026-10-08T12:00:05.000Z", "2026-10-08T12:00:00.000Z"),
    ).toBe(DEFAULT_MOTION_MS);
    expect(motionDuration("not a date", "2026-10-08T12:00:00.000Z")).toBe(
      DEFAULT_MOTION_MS,
    );
  });
});

describe("shouldTeleport", () => {
  it("slides across a neighbourhood, jumps across a city", () => {
    expect(shouldTeleport(DEPOT, near(1_000, 0))).toBe(false);
    expect(shouldTeleport(DEPOT, near(8_000, 0))).toBe(true);
  });
});

describe("sampleMotion", () => {
  const motion = {
    from: DEPOT,
    to: near(100, 0),
    angleFrom: 350,
    angleTo: 370,
    startedAt: 1_000,
    duration: 2_000,
  };

  it("starts where the truck was drawn", () => {
    const frame = sampleMotion(motion, 1_000);

    expect(frame).toMatchObject({
      latitude: DEPOT.latitude,
      longitude: DEPOT.longitude,
      angle: 350,
      done: false,
    });
  });

  it("is half way, turned half way, at the middle", () => {
    const frame = sampleMotion(motion, 2_000);

    expect(frame.latitude).toBeCloseTo(
      (DEPOT.latitude + motion.to.latitude) / 2,
      10,
    );
    expect(frame.angle).toBeCloseTo(360, 6);
    expect(frame.done).toBe(false);
  });

  it("lands exactly on the target and says so", () => {
    expect(sampleMotion(motion, 3_500)).toEqual({
      ...motion.to,
      angle: 370,
      done: true,
    });
  });

  it("lands at once with no duration", () => {
    expect(sampleMotion({ ...motion, duration: 0 }, 1_000).done).toBe(true);
  });
});

describe("vehicleStatus", () => {
  it("splits a fresh truck by its speed", () => {
    expect(vehicleStatus({ state: "moving", fresh: true, speed: 12 })).toBe(
      "moving",
    );
    expect(vehicleStatus({ state: "moving", fresh: true, speed: 0.3 })).toBe(
      "stopped",
    );
  });

  it("does not call a truck stopped when the phone sent no speed", () => {
    expect(vehicleStatus({ state: "moving", fresh: true, speed: null })).toBe(
      "moving",
    );
    expect(vehicleStatus({ state: "moving", fresh: true, speed: -1 })).toBe(
      "moving",
    );
  });

  it("shows an open pause, over a quiet phone too", () => {
    expect(
      vehicleStatus({
        state: "moving",
        fresh: true,
        speed: 0,
        pausedSince: "2026-10-08T12:00:00Z",
      }),
    ).toBe("paused");
    expect(
      vehicleStatus({
        state: "silent",
        fresh: false,
        pausedSince: "2026-10-08T12:00:00Z",
      }),
    ).toBe("paused");
  });

  it("keeps silent and ended, and a finished route never shows a pause", () => {
    expect(vehicleStatus({ state: "silent", fresh: false, speed: 10 })).toBe(
      "silent",
    );
    expect(
      vehicleStatus({
        state: "ended",
        fresh: false,
        pausedSince: "2026-10-08T12:00:00Z",
      }),
    ).toBe("ended");
  });

  it("reads an older payload without a state by its freshness", () => {
    expect(vehicleStatus({ fresh: true })).toBe("moving");
    expect(vehicleStatus({ fresh: false })).toBe("silent");
  });
});
