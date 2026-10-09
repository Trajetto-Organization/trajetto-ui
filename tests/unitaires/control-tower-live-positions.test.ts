import { describe, expect, it } from "vitest";

import {
  isNewerPosition,
  mergeLivePosition,
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
