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

            {index === breadcrumbs.length - 1 && (
              <BreadcrumbPage>{item.title}</BreadcrumbPage>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export { ProtectedBreadCrumbs };
