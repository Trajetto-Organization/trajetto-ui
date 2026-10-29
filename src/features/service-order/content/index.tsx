import { Wrench } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { MaintenanceAccessError } from "../access-error";

import { ServiceOrderPageActions } from "../page-actions";
import { ServiceOrderStats } from "../stats";
import { ServiceOrderTable } from "../table";
import { fetchMaintenanceList } from "../lib/fetch-list";
import type { FleetScope } from "../lib/service-order-rules";
import {
  serviceOrderListQuery,
  type PageSearchParams,
  type ServiceOrderRow,
  type ServiceOrderSearchMeta,
} from "../server-table";

interface ServiceOrderContentProps {
  /** "admin": the master picks the company above; "dashboard": the session's. */
  mode: FleetScope;
  searchParams: PageSearchParams;
  token: string;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Ordens de serviço, one screen for /admin and /dashboard (decision 8.7).
 *
 * The admin copy listed every company's orders in one table with cards that
 * counted the loaded page; now the master picks the company at the top, like
 * Entregas, and the cards, filters and order come from the server for that
 * company (decision 8.8).
 */
const ServiceOrderContent = async ({
  mode,
  searchParams,
  token,
}: ServiceOrderContentProps): Promise<JSX.Element> => {
  const businessId =
    mode === "admin"
      ? readBusinessIdParam(first(searchParams.businessId))
      : undefined;

  const toolbar = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? (
          <ServiceOrderPageActions scope={mode} hasData={hasData} />
        ) : undefined
      }
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {toolbar(false)}
        <SelectBusinessEmptyState
          icon={Wrench}
          description="As ordens de serviço, os cartões e os filtros são de uma empresa por vez."
        />
      </div>
    );
  }

  const query = new URLSearchParams({
    page: String(Number(first(searchParams.page)) || 1),
    pageSize: String(Number(first(searchParams.pageSize)) || 10),
    search: first(searchParams.search) ?? "",
    ...(businessId && { businessId }),
    ...serviceOrderListQuery(searchParams),
  });

  const list = await fetchMaintenanceList<
    ServiceOrderRow,
    ServiceOrderSearchMeta
  >({
    path: "/service-order/list-service-order",
    query,
    token,
    tag: "update-service-order",
    what: "a lista de ordens de serviço",
  });

  if (list.accessError) {
    return (
      <div className="my-6 space-y-6">
        {toolbar(false)}
        <MaintenanceAccessError
          error={list.accessError}
          mode={mode}
          businessId={businessId}
        />
      </div>
    );
  }

  return (
    // A company switch remounts the body: no dialog or filter of company A
    // survives under B (decision 2.6).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {toolbar(true, list.meta.total > 0)}

      <ServiceOrderStats searchMeta={list.searchMeta} />

      <ServiceOrderTable
        scope={mode}
        data={list.rows}
        meta={list.meta}
        responseError={list.responseError}
        searchMeta={list.searchMeta}
      />
    </div>
  );
};

export { ServiceOrderContent };
