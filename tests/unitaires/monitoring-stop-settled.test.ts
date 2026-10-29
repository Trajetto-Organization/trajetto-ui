import { describe, expect, it } from "vitest";

import type { MonitoredRoute } from "@/actions/control-tower/types";
import {
  applyStopSettled,
  isStopSettled,
} from "@/features/deliveries/monitoring/lib/progress";

/**
 * A stop patched live on the board by route (decision 6.6).
 *
 * The socket's `route-stop.settled` carried the new status but not the
 * moment: the dot turned green and lost its "às HH:mm" until the next
 * refetch. When the event says when the stop settled, the patch keeps it;
 * an event without it leaves the stored moment alone.
 */
function route(): MonitoredRoute {
  return {
    id: "r1",
    stops: [
      {
        id: "s1",
        sequence: 1,
        status: "PENDING",
        deliveryId: "d1",
        recipientName: "Ana",
        city: "Cuiabá",
        onTheWayAt: null,
        arrivedAt: "2026-09-29T13:00:00.000Z",
        completedAt: null,
      },
    ],
  } as unknown as MonitoredRoute;
}

describe("a settled stop, patched from the socket", () => {
  it("keeps the moment the event says it settled", () => {
    const event = {
      type: "route-stop.settled",
      routeId: "r1",
      stopId: "s1",
      stopStatus: "COMPLETED",
      completedAt: "2026-09-29T13:05:00.000Z",
    };

    expect(isStopSettled(event)).toBe(true);

    const [patched] = applyStopSettled([route()], event as never);

    expect(patched.stops[0].status).toBe("COMPLETED");
    expect(patched.stops[0].completedAt).toBe("2026-09-29T13:05:00.000Z");
  });

  it("leaves the stored moment alone when the event carries none", () => {
    const [patched] = applyStopSettled([route()], {
      type: "route-stop.settled",
      routeId: "r1",
      stopId: "s1",
      stopStatus: "FAILED",
    });

    expect(patched.stops[0].status).toBe("FAILED");
    expect(patched.stops[0].completedAt).toBeNull();
    expect(patched.stops[0].arrivedAt).toBe("2026-09-29T13:00:00.000Z");
  });
});
