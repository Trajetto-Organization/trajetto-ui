"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

import { useRoutesBusinessId } from "../hooks/use-routes-business-id";
import { routesBoardHref } from "../lib/route-links";

/**
 * Back to the board and Atualizar, laid out like every page's actions
 * (decision 3.6): full width on a phone, the page actions' height (h-9, decision 16.61) on /admin.
 */
const RouteDetailPageActions = (): JSX.Element => {
  const pathname = usePathname();
  const businessId = useRoutesBusinessId();
  const buttonClassName = usePageActionClassName();

  return (
    <PageActions>
      <Button asChild size="sm" variant="outline" className={buttonClassName}>
        <Link href={routesBoardHref(pathname, businessId)}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">Voltar para Rotas</span>
        </Link>
      </Button>

      <DataTableRevalidate
        rateLimit={{
          storageKey: "route-detail",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />
    </PageActions>
  );
};

export { RouteDetailPageActions };
