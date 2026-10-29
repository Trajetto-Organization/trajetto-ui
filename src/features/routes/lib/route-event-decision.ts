/**
 * What the route page does with one `routeEvent` (decision 14.7, §5.7), pure.
 *
 * - another route's event (or a malformed one): nothing;
 * - this route's plan changed by somebody else while the dispatcher holds an
 *   unsaved order: "hold" — the page shows "Esta rota foi alterada por outra
 *   pessoa — Recarregar" instead of yanking the list from under their hands;
 * - anything else about this route (released, started, a stop settled, a
 *   delivery's status, the plan changed with nothing local): "refetch".
 *
 * A plan event whose version is not newer than the one on screen, or one a
 * write of this page produced (`ownVersions`, see own-plan-writes), is our
 * own write echoing back: nothing.
 */
type RouteEventDecision = "ignore" | "refetch" | "hold";

interface RouteEventContext {
  routeId: string;
  knownPlanVersion: number;
  holdingLocalChanges: boolean;

  /** Plan versions this page's own writes produced. */
  ownVersions?: ReadonlySet<number>;
}

function routeEventDecision(
  incoming: unknown,
  context: RouteEventContext,
): RouteEventDecision {
  if (!incoming || typeof incoming !== "object") return "ignore";

  const event = incoming as {
    type?: unknown;
    routeId?: unknown;
    planVersion?: unknown;
  };

  if (event.routeId !== context.routeId) return "ignore";

  if (event.type === "route.stops_changed") {
    const version =
      typeof event.planVersion === "number" ? event.planVersion : null;

    if (version !== null && version <= context.knownPlanVersion)
      return "ignore";
    if (version !== null && context.ownVersions?.has(version)) return "ignore";

    return context.holdingLocalChanges ? "hold" : "refetch";
  }

  return "refetch";
}

export { routeEventDecision };
export type { RouteEventContext, RouteEventDecision };
