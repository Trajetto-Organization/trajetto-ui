import { describe, expect, it } from "vitest";

import { clusterStatus } from "@/features/control-tower/lib/vehicle-motion";

/**
 * How one badge stands for several trucks. It used to read only the API's
 * three states, so a yard of parked or paused trucks was a blue "em rota"
 * badge that split into amber and violet trucks on zoom; and before that, a
 * yard of finished routes was grey, like phones without signal (TWR-8).
 */
describe("clusterStatus", () => {
  it("is moving when any truck is", () => {
    expect(
      clusterStatus(["ended", "silent", "paused", "stopped", "moving"]),
    ).toBe("moving");
  });

  it("is stopped for a yard of parked trucks, not moving", () => {
    expect(clusterStatus(["stopped", "stopped"])).toBe("stopped");
    expect(clusterStatus(["paused", "stopped", "silent"])).toBe("stopped");
  });

  it("is paused when every live truck in it is on a break", () => {
    expect(clusterStatus(["paused", "paused"])).toBe("paused");
    expect(clusterStatus(["paused", "silent", "ended"])).toBe("paused");
  });

  it("is silent when a running route went quiet, even beside finished ones", () => {
    expect(clusterStatus(["ended", "silent"])).toBe("silent");
  });

  it("is ended only when every truck finished", () => {
    expect(clusterStatus(["ended", "ended"])).toBe("ended");
  });

  it("is silent for an empty group rather than claiming anything finished", () => {
    expect(clusterStatus([])).toBe("silent");
  });
});
