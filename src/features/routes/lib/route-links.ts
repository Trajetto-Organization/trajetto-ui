/**
 * The route page's address (decision 14.7, D12): /dashboard/routes/<id> for
 * a company user, /admin/routes/<id>?businessId= for the MASTER, who picks
 * the company. The area comes from where the user is now, so a link built on
 * Entregas in /admin stays in /admin.
 */
function routeDetailHref(
  pathname: string | null | undefined,
  routeId: string,
  businessId?: string | null,
): string {
  const admin = (pathname ?? "").startsWith("/admin");

  if (admin) {
    const query = businessId
      ? `?businessId=${encodeURIComponent(businessId)}`
      : "";

    return `/admin/routes/${encodeURIComponent(routeId)}${query}`;
  }

  return `/dashboard/routes/${encodeURIComponent(routeId)}`;
}

/** Back to the board, in the same area and company. */
function routesBoardHref(
  pathname: string | null | undefined,
  businessId?: string | null,
): string {
  const admin = (pathname ?? "").startsWith("/admin");

  if (admin) {
    return businessId
      ? `/admin/routes?businessId=${encodeURIComponent(businessId)}`
      : "/admin/routes";
  }

  return "/dashboard/routes";
}

export { routeDetailHref, routesBoardHref };
