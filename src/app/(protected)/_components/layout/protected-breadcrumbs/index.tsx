"use client";

import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Slash } from "lucide-react";
import { useBreadcrumbs } from "./hooks";

const ProtectedBreadCrumbs = (): JSX.Element | null => {
  const { breadcrumbs } = useBreadcrumbs();
  if (breadcrumbs.length === 0) return null;

  return (
    // One line that shrinks from its last crumb: the header is h-14 and sits
    // beside a fixed-width search, so a long page name ends in an ellipsis
    // (full name in its title) instead of pushing the header past <main>.
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {breadcrumbs.map((item, index) => (
          <Fragment key={item.title}>
            {index !== breadcrumbs.length - 1 && (
              <BreadcrumbItem className="hidden lg:block">
                <BreadcrumbLink href={item.link}>{item.title}</BreadcrumbLink>
              </BreadcrumbItem>
            )}

            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator className="hidden lg:block">
                <Slash />
              </BreadcrumbSeparator>
            )}

            {/* The last crumb needs its wrapper like every other one: an
                <ol> may only hold <li>, and BreadcrumbPage renders a <span
                role="link">. Straight inside the list it broke the list
                semantics, so a screen reader stopped announcing "item 3 of
                3" — the position of the current page, which is the one thing
                a breadcrumb exists to convey. */}
            {index === breadcrumbs.length - 1 && (
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="block truncate" title={item.title}>
                  {item.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export { ProtectedBreadCrumbs };
