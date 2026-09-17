import { appRoutes, type AppRoute } from "@/app/app-routes";

import type {
  PermissionKey,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

interface RouteAccessContext {
  role: UserRole;
  /** Permission keys of a BUSINESS_USER; ignored for the other roles. */
  permissions?: PermissionKey[];
  /**
   * Modules the company hired, as `/user/me` reports them. `null` means
   * "not known yet" and keeps the gate open — hiding a menu on a value we
   * have not confirmed is how the sidebar used to erase itself.
   */
  enabledModules?: string[] | null;
  /** Drivers carry no profile access, so the permission gate cannot apply. */
  isDriver?: boolean;
}

interface RouteAccessOptions {
  /**
   * What to do with a path that is not in the registry. Navigation menus
   * allow it (their entries are hand-written and may outrun the registry);
   * the dashboard shortcut cards deny it, which is what keeps "Empresas"
   * off a company dashboard — there is no /dashboard/business.
   */
  unregistered?: "allow" | "deny";
}

/**
 * Longest matching entry, so /dashboard/vehicle-checklist never resolves to
 * /dashboard/vehicle. Segment-aware on purpose: a prefix only matches on a
 * "/" boundary.
 */
function findAppRoute(pathname: string): AppRoute | undefined {
  let match: AppRoute | undefined;

  for (const route of appRoutes) {
    const isMatch = route.exact
      ? pathname === route.path
      : pathname === route.path || pathname.startsWith(`${route.path}/`);

    if (isMatch && (!match || route.path.length > match.path.length)) {
      match = route;
    }
  }

  return match;
}

/**
 * Where a driver is allowed to be, mirroring the edge middleware's allow-list.
 *
 * Kept as a list of prefixes rather than derived from the registry: the
 * middleware runs before any of this and decides by prefix, and two rules that
 * are supposed to agree should be written the same way.
 */
const DRIVER_SURFACE = ["/driver", "/profile", "/notifications"];

function isDriverSurface(pathname: string): boolean {
  return DRIVER_SURFACE.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * The one access verdict for a page, shared by every surface that shows or
 * guards one. Role decides which gates apply:
 *
 *   MASTER         — neither. The back office operates across companies.
 *   BUSINESS_ADMIN — module only. Admins hold every permission of their own
 *                    company by definition.
 *   BUSINESS_USER  — both, except drivers, who have no profile access.
 */
function canAccessPath(
  pathname: string,
  context: RouteAccessContext,
  options: RouteAccessOptions = {},
): boolean {
  const route = findAppRoute(pathname);

  if (!route) return options.unregistered !== "deny";
  if (context.role === "MASTER") return true;

  /**
   * A driver's surface is the driver's surface.
   *
   * The edge middleware already refuses anything outside `/driver`,
   * `/profile` and `/notifications` for a driver, and that is what actually
   * stops the request. This rule exists so the two agree: without it
   * `canAccessPath` answered TRUE for a driver on Entregas, Rotas, Torre and
   * Integrações — the permission gate is skipped for drivers, because they
   * carry no profile access — and every surface that asks this function
   * instead of the middleware would have offered them the whole office.
   *
   * Nothing was leaking, because the palette builds a different action list
   * per role and the edge blocks the URL. Both are layers ON TOP of a rule
   * that said yes, and a rule that says yes is one refactor from being the
   * only one left.
   */
  if (context.isDriver && !isDriverSurface(pathname)) return false;

  const { enabledModules } = context;

  if (
    route.requiredModule &&
    enabledModules != null &&
    !enabledModules.includes(route.requiredModule)
  ) {
    return false;
  }

  if (!route.requiredPermission) return true;
  if (context.role === "BUSINESS_ADMIN" || context.isDriver) return true;

  return (context.permissions ?? []).includes(route.requiredPermission);
}

/** Where a user goes when the page they asked for is not theirs to see. */
function accessDeniedRedirect(role: UserRole, isDriver?: boolean): string {
  if (role === "MASTER") return "/admin";
  return isDriver ? "/profile" : "/dashboard";
}

export { findAppRoute, canAccessPath, accessDeniedRedirect };
export type { RouteAccessContext, RouteAccessOptions };
