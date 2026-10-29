import { usePathname } from "next/navigation";
import { AppRoute, appRoutes } from "@/app/app-routes";

import { routeMatchesExactly } from "@/lib/route-access";

interface Crumb {
  title: string;
  link: string;
}

/**
 * One crumb per registered prefix of the path. Matched with the registry's
 * own rule, so a page under an id (/driver/vehicles/:vehicleId/fuels) gets
 * its crumb, linked to the real path rather than to the pattern.
 */
function getRouteHierarchy(pathname: string, routes: AppRoute[]): Crumb[] {
  let currentPath = "";

  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      currentPath += `/${segment}`;

      const prefix = currentPath;
      const route = routes.find((candidate) =>
        routeMatchesExactly(candidate, prefix),
      );

      return route ? { title: route.title, link: prefix } : undefined;
    })
    .filter((crumb): crumb is Crumb => Boolean(crumb));
}

function useBreadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = getRouteHierarchy(pathname, appRoutes);

  return { breadcrumbs };
}

export { useBreadcrumbs, getRouteHierarchy };
