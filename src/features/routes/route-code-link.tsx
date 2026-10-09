"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useRoutesBusinessId } from "./hooks/use-routes-business-id";
import { routeDetailHref } from "./lib/route-links";

interface RouteCodeLinkProps {
  routeId: string;
  code: number;
}

/**
 * "Rota 12" as a link to the route's page, in the area the user is in and,
 * on /admin, with the company the MASTER picked.
 */
const RouteCodeLink = ({ routeId, code }: RouteCodeLinkProps): JSX.Element => {
  const pathname = usePathname();
  const businessId = useRoutesBusinessId();

  return (
    <Link
      href={routeDetailHref(pathname, routeId, businessId)}
      // leading-6: a 24px line, so the tap target reaches the 24x24 of
      // WCAG 2.5.8 on a phone (one line of text-sm was 20px tall).
      className="block truncate font-medium leading-6 underline-offset-4 hover:underline
      focus-visible:underline focus-visible:outline-none"
    >
      Rota {code}
    </Link>
  );
};

export { RouteCodeLink };
