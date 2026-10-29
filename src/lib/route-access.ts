import {
  appRoutes,
  type AppRoute,
  type BusinessModuleKey,
} from "@/app/app-routes";

import type {
  PermissionKey,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

interface RouteAccessContext {
  role: UserRole;
  /**
   * Permission keys of a BUSINESS_USER that are READABLE; ignored for the
   * other roles. Build it with `readablePermissionKeys`, never by mapping the
   * profile's rows: a row with canRead false is not access.
   */
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

/** What a page, a tab or a card asks of the session. */
type AccessRequirement = Pick<
  AppRoute,
  "requiredPermission" | "requiredModule" | "allowedRoles"
>;

interface PermissionRow {
  permissionKey: PermissionKey;
  canRead?: boolean;
}

/**
 * The keys a profile may READ.
 *
 * The four places that build a `RouteAccessContext` used to map every row to
 * its key, so a row saved with canRead false (the bulk screen accepted it)
 * still opened the page, and the API then refused every request on it.
 * A row without the flag at all is an older payload and counts as readable,
 * which is what the API assumed before the flag existed.
 */
function readablePermissionKeys(
  rows: readonly PermissionRow[] | null | undefined,
): PermissionKey[] {
  return (rows ?? [])
    .filter((row) => row.canRead !== false)
    .map((row) => row.permissionKey);
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * How closely `route` describes `pathname`, or -1 when it does not.
 *
 * Segment-aware, so /dashboard/vehicle-checklist never resolves to
 * /dashboard/vehicle; ":param" segments match any one segment. More matched
 * segments win, and among equals a literal beats a parameter.
 */
function matchScore(route: AppRoute, pathname: string): number {
  const routeSegments = segmentsOf(route.path);
  const pathSegments = segmentsOf(pathname);

  if (route.exact && routeSegments.length !== pathSegments.length) return -1;
  if (routeSegments.length > pathSegments.length) return -1;

  let literals = 0;

  for (let index = 0; index < routeSegments.length; index += 1) {
    const expected = routeSegments[index];

    if (expected.startsWith(":")) continue;
    if (expected !== pathSegments[index]) return -1;

    literals += 1;
  }

  return routeSegments.length * 100 + literals;
}

/** The registry entry that answers for this path. */
function findAppRoute(pathname: string): AppRoute | undefined {
  let match: AppRoute | undefined;
  let best = -1;

  for (const route of appRoutes) {
    const score = matchScore(route, pathname);

    if (score > best) {
      best = score;
      match = route;
    }
  }

  return match;
}

/** Whether `route` names exactly this path (breadcrumbs walk it segment by segment). */
function routeMatchesExactly(route: AppRoute, pathname: string): boolean {
  return (
    segmentsOf(route.path).length === segmentsOf(pathname).length &&
    matchScore(route, pathname) >= 0
  );
}

/**
 * Where a driver is allowed to be, mirroring the edge middleware's allow-list.
 *
 * The middleware imports this same function, so the two rules are one.
 */
const DRIVER_SURFACE = ["/driver", "/profile", "/notifications"];

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isDriverSurface(pathname: string): boolean {
  return DRIVER_SURFACE.some((prefix) => underPrefix(pathname, prefix));
}

/**
 * The driver's own pages, which only a driver can have: they read "my
 * vehicles" and "my payables" from a session that has a driver. The other
 * half of the driver rule, shared with the edge middleware like
 * `isDriverSurface`; segment-aware, so "/drivers" is not "/driver".
 */
function isDriverOnlyPath(pathname: string): boolean {
  return underPrefix(pathname, "/driver");
}

function moduleAllowed(
  module: BusinessModuleKey | undefined,
  enabledModules: readonly string[] | null | undefined,
): boolean {
  return !module || enabledModules == null || enabledModules.includes(module);
}

/**
 * The verdict for a requirement, shared by pages (through `canAccessPath`)
 * and by what lives inside a page — the tabs of Entregas read their own key
 * here, so a tab and the page it opens can never disagree. Role decides which
 * gates apply:
 *
 *   MASTER         — none. The menus are back office across companies; the
 *                    SELECTED company's plan is answered on the page itself.
 *   BUSINESS_ADMIN — role and module. Admins hold every permission of their
 *                    own company by definition.
 *   BUSINESS_USER  — all three, except drivers, who have no profile access.
 */
function canAccessRequirement(
  requirement: AccessRequirement,
  context: RouteAccessContext,
): boolean {
  if (context.role === "MASTER") {
    return (
      !requirement.allowedRoles || requirement.allowedRoles.includes("MASTER")
    );
  }

  if (
    requirement.allowedRoles &&
    !requirement.allowedRoles.includes(context.role)
  ) {
    return false;
  }

  if (!moduleAllowed(requirement.requiredModule, context.enabledModules)) {
    return false;
  }

  if (!requirement.requiredPermission) return true;
  if (context.role === "BUSINESS_ADMIN" || context.isDriver) return true;

  return (context.permissions ?? []).includes(requirement.requiredPermission);
}

/**
 * The one access verdict for a page, shared by every surface that shows or
 * guards one: sidebar, ⌘K, dashboard cards, the server gate, the realtime
 * gate and the edge middleware's role rule.
 */
function canAccessPath(
  pathname: string,
  context: RouteAccessContext,
  options: RouteAccessOptions = {},
): boolean {
  /**
   * A driver's surface is the driver's surface. Decided before the registry
   * lookup, like the edge decides it: the rule is about the path, registered
   * or not.
   *
   * The edge middleware already refuses anything outside `/driver`,
   * `/profile` and `/notifications` for a driver, and that is what actually
   * stops the request. This rule exists so the two agree: without it
   * `canAccessPath` answered TRUE for a driver on Entregas, Rotas, Torre and
   * Integrações — the permission gate is skipped for drivers, because they
   * carry no profile access.
   */
  if (context.isDriver && !isDriverSurface(pathname)) return false;

  // And the other way round: nobody but a driver lands on /driver. The edge
  // bounced employees and the MASTER from there while this answered true,
  // so a menu built from it could offer them a page they never reach.
  if (!context.isDriver && isDriverOnlyPath(pathname)) return false;

  const route = findAppRoute(pathname);

  if (!route) return options.unregistered !== "deny";

  return canAccessRequirement(route, context);
}

/**
 * Keys that guard no page of their own, so the registry cannot tell their
 * module. Ocorrências are managed inside Entregas (the API serves them under
 * the deliveries module).
 */
const PERMISSION_MODULE_WITHOUT_ROUTE: Partial<
  Record<PermissionKey, BusinessModuleKey>
> = {
  occurrence_manage: "DELIVERIES",
};

/**
 * The module a permission key belongs to, read from the pages it guards: a
 * key whose every page needs one module is that module's; a key that guards
 * a page open to every plan (vehicles, drivers, branches...) is shared and
 * answers undefined. Derived, so a new page cannot leave the pickers behind.
 */
function permissionKeyModule(key: string): BusinessModuleKey | undefined {
  const modules = new Set<BusinessModuleKey | undefined>();

  for (const route of appRoutes) {
    if (route.requiredPermission === key) modules.add(route.requiredModule);
  }

  if (modules.size === 0) {
    return PERMISSION_MODULE_WITHOUT_ROUTE[key as PermissionKey];
  }

  if (modules.size > 1 || modules.has(undefined)) return undefined;

  return [...modules][0];
}

/**
 * The permission keys worth offering to a company: the permission form, the
 * profile-access matrix and the "Recurso" filter read this, so a company
 * that hired only Entregas is not asked about Multas. Same gate as the
 * sidebar: the MASTER (back office across companies) and unknown modules see
 * every key; `keep` holds keys that must stay listed anyway (the value a
 * permission being edited already has).
 */
function permissionKeysInPlan<TKey extends string>(
  keys: readonly TKey[],
  context: {
    role: UserRole | null | undefined;
    enabledModules?: readonly string[] | null;
  },
  keep: readonly string[] = [],
): TKey[] {
  if (context.role === "MASTER") return [...keys];

  return keys.filter(
    (key) =>
      keep.includes(key) ||
      moduleAllowed(permissionKeyModule(key), context.enabledModules),
  );
}

/** Where a user goes when the page they asked for is not theirs to see. */
function accessDeniedRedirect(role: UserRole, isDriver?: boolean): string {
  if (role === "MASTER") return "/admin";
  return isDriver ? "/profile" : "/dashboard";
}

export {
  findAppRoute,
  routeMatchesExactly,
  canAccessPath,
  canAccessRequirement,
  accessDeniedRedirect,
  isDriverOnlyPath,
  isDriverSurface,
  readablePermissionKeys,
  permissionKeyModule,
  permissionKeysInPlan,
};
export type { AccessRequirement, RouteAccessContext, RouteAccessOptions };
