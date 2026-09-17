"use client";

import { useRouteEvents } from "@/hooks/use-route-events";

interface DeliveriesRealtimeProps {
  /** Present only on the admin surface, where a master picks the company. */
  businessId?: string;

  /** The cache tag of the tab being shown, so only it is invalidated. */
  tag: string;
}

/**
 * Makes the delivery screens follow the operation.
 *
 * A route starting is a delivery event as much as a route one: the stops'
 * deliveries become IN_TRANSIT in the same commit, and the monitoring panel's
 * six numbers change with every stop that settles. None of it reached an open
 * tab — the API emitted `routeEvent` and nothing in this repository listened.
 *
 * Invalidates the ACTIVE tab's tag rather than a fixed list: a dispatcher
 * looking at Embarcadores has no reason to refetch because a truck arrived,
 * and the events arrive all day.
 */
const DeliveriesRealtime = ({
  businessId,
  tag,
}: DeliveriesRealtimeProps): null => {
  useRouteEvents(businessId, [tag]);

  return null;
};

export { DeliveriesRealtime };
