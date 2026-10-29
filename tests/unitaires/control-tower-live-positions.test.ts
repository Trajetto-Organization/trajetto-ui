import { describe, expect, it } from "vitest";

import {
  isNewerPosition,
  mergeLivePosition,
  pruneLivePositions,
} from "@/features/control-tower/lib/live-positions";

/**
 * A dot on the tower only ever moves forward in time.
 *
 * `driverPosition` events arrive in whatever order the network delivers
 * them: two flushes of one phone answered by different replicas, or an
 * outbox resending an older batch after a newer one. The panel took every
 * event as the latest and drew the truck back where it was minutes ago
 * until the next ping — or until the 30-second refetch.
 */
const t1 = "2026-09-24T12:00:00.000Z";
const t2 = "2026-09-24T12:01:00.000Z";

const position = (recordedAt: string, latitude = -23.5) => ({
  driverId: "driver-1",
  recordedAt,
  latitude,
});

describe("isNewerPosition", () => {
  it("is false for an older point", () => {
    expect(isNewerPosition(t1, t2)).toBe(false);
  });

  it("is true for a newer point, or when there is nothing yet", () => {
    expect(isNewerPosition(t2, t1)).toBe(true);
    expect(isNewerPosition(t1, undefined)).toBe(true);
  });

  it("lets the same instant through, as the latest word", () => {
    expect(isNewerPosition(t1, t1)).toBe(true);
  });
});

describe("mergeLivePosition", () => {
  it("keeps the stored point when an older one arrives, same object", () => {
    const current = { "driver-1": position(t2, -23.5) };

    // The same reference, so React bails out of the render.
    expect(mergeLivePosition(current, position(t1, -23.9))).toBe(current);
  });

  it("replaces it with a newer one", () => {
    const current = { "driver-1": position(t1, -23.9) };

    const merged = mergeLivePosition(current, position(t2, -23.5));

    expect(merged["driver-1"]).toEqual(position(t2, -23.5));
    expect(merged).not.toBe(current);
  });

  it("adds a driver it has not seen", () => {
    const merged = mergeLivePosition({}, position(t1));

    expect(merged["driver-1"]).toEqual(position(t1));
  });
});

/**
 * A read used to wipe every socket dot. A point that arrived while the read
 * was in flight was replaced by the read's older snapshot, and the truck
 * jumped back until its next ping.
 */
describe("pruneLivePositions", () => {
  const t3 = "2026-09-24T12:02:00.000Z";

  it("keeps a dot recorded after the read's own point", () => {
    const live = { "driver-1": position(t3, -23.9) };

    expect(pruneLivePositions(live, [position(t2)])).toBe(live);
  });

  it("drops a dot the read already covers, or the same instant", () => {
    expect(
      pruneLivePositions({ "driver-1": position(t1) }, [position(t2)]),
    ).toEqual({});
    expect(
      pruneLivePositions({ "driver-1": position(t2) }, [position(t2)]),
    ).toEqual({});
  });

  it("drops a driver the read does not list: the read decides who is on the map", () => {
    const live = {
      "driver-1": position(t3),
      "driver-2": { ...position(t3), driverId: "driver-2" },
    };

    expect(Object.keys(pruneLivePositions(live, [position(t2)]))).toEqual([
      "driver-1",
    ]);
  });
});
