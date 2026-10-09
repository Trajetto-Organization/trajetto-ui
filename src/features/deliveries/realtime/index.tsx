"use client";

import { useRouteEvents } from "@/hooks/use-route-events";

interface DeliveriesRealtimeProps {
  /** Present only on the admin surface, where a master picks the company. */
  businessId?: string;
}

/**
 * Makes the delivery screens follow the operation.
 *
 * A route starting is a delivery event as much as a route one: the stops'
 * deliveries become IN_TRANSIT in the same commit, and the monitoring panel's
 * six numbers change with every stop that settles. useRouteEvents listens to
 * `routeEvent` and refreshes the tab on screen.
 */
const DeliveriesRealtime = ({ businessId }: DeliveriesRealtimeProps): null => {
  useRouteEvents(businessId);

  return null;
};

export { DeliveriesRealtime };
