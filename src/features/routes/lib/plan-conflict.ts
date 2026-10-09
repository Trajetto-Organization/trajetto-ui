/**
 * The refusals that mean "the route changed since you read it" (decision
 * 14.7, D5): the page reloads the plan instead of showing an error the
 * dispatcher can do nothing about.
 */
const PLAN_CONFLICT_CODES = new Set([
  "ROUTE_PLAN_STALE",
  "ROUTE_REORDER_MISMATCH",
]);

function isPlanConflict(code: string | undefined | null): boolean {
  return code ? PLAN_CONFLICT_CODES.has(code) : false;
}

export { isPlanConflict };
