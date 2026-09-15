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
    <Breadcrumb>
      <BreadcrumbList>
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
              <BreadcrumbItem>
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export { ProtectedBreadCrumbs };
