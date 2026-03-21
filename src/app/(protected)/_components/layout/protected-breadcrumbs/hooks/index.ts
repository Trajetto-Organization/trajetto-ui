import { usePathname } from "next/navigation";
import { AppRoute, appRoutes } from "@/app/app-routes";

function getRouteHierarchy(pathname: string, routes: AppRoute[]): AppRoute[] {
  let currentPath = "";

  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      currentPath += `/${segment}`;
      return routes.find((route) => route.path === currentPath);
    })
    .filter((route): route is AppRoute => Boolean(route));
}

function useBreadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = getRouteHierarchy(pathname, appRoutes).map((route) => ({
    title: route.title,
    link: route.path,
  }));

  return { breadcrumbs };
}

export { useBreadcrumbs };
