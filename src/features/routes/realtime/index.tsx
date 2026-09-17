"use client";

import { useRouteEvents } from "@/hooks/use-route-events";

interface RoutesRealtimeProps {
  /** Present only on the admin surface, where a master picks the company. */
  businessId?: string;
}

/**
 * Makes the Rotas board follow the operation instead of a page load.
 *
 * Renders nothing. It exists because the page is a server component and the
 * subscription is a client concern — mounting the hook is the whole job.
 *
 * Before this, a route stayed RELEASED on screen for as long as the tab was
 * open while the driver had left an hour earlier, and the only way to find
 * out was to press Atualizar. The API had been emitting the event the whole
 * time; nothing anywhere listened to it.
 */
const RoutesRealtime = ({ businessId }: RoutesRealtimeProps): null => {
  useRouteEvents(businessId);

  return null;
};

export { RoutesRealtime };
