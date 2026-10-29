import { Package } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { MaintenanceAccessError } from "../../access-error";

import { fetchMaintenanceList } from "../../lib/fetch-list";
import type { FleetScope } from "../../lib/service-order-rules";

import { OrderPartPageActions } from "../page-actions";
import { OrderPartStats } from "../stats";
import { OrderPartTable } from "../table";
import { orderPartListQuery } from "../server-table";
import type {
  OrderPartRow,
  OrderPartSearchMeta,
} from "../lib/order-part-rules";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Peças das ordens de serviço, one screen for /admin and /dashboard
 * (decision 8.7). The cards (value with discounts, lines with a discount,
 * mean value) were sums over the ten rows on screen; they are the server's
 * now, over the whole company (decision 8.8).
 */
const ServiceOrderPartContent = async ({
  mode,
  searchParams,
  token,
}: {
  mode: FleetScope;
  searchParams: Record<string, string | string[] | undefined>;
  token: string;
}): Promise<JSX.Element> => {
  const businessId =
    mode === "admin"
      ? readBusinessIdParam(first(searchParams.businessId))
      : undefined;

  const toolbar = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <OrderPartPageActions scope={mode} /> : undefined}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {toolbar(false)}
        <SelectBusinessEmptyState
          icon={Package}
          description="As peças lançadas nas ordens de serviço, com quantidades e valores, são de cada empresa."
        />
      </div>
    );
  }

  const query = new URLSearchParams({
    page: String(Number(first(searchParams.page)) || 1),
    pageSize: String(Number(first(searchParams.pageSize)) || 10),
    search: first(searchParams.search) ?? "",
    ...(businessId && { businessId }),
    ...orderPartListQuery(searchParams),
  });

  const list = await fetchMaintenanceList<OrderPartRow, OrderPartSearchMeta>({
    path: "/service-order-part/list-service-order-part",
    query,
    token,
    tag: "update-service-order-part",
    what: "a lista de peças das ordens de serviço",
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
    // A company switch remounts the body (decision 2.6).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {toolbar(true)}

      <OrderPartStats searchMeta={list.searchMeta} />

      <OrderPartTable
        scope={mode}
        data={list.rows}
        meta={list.meta}
        responseError={list.responseError}
        searchMeta={list.searchMeta}
      />
    </div>
  );
};

export { ServiceOrderPartContent };
