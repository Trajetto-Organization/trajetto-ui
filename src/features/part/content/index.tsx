import { Package } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { MaintenanceAccessError } from "@/features/service-order/access-error";

import { fetchMaintenanceList } from "@/features/service-order/lib/fetch-list";
import type { FleetScope } from "@/features/service-order/lib/service-order-rules";

import { PartPageActions } from "../page-actions";
import { PartStats } from "../stats";
import { PartTable } from "../table";
import { partListQuery } from "../server-table";
import type { PartRow, PartSearchMeta } from "../lib/part-rules";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Peças, one screen for /admin and /dashboard (decision 8.7): the master
 * picks the company at the top (the admin copy listed every company's parts
 * together), and the cards, supplier filter and order come from the server
 * over the whole catalog (decision 8.8).
 */
const PartContent = async ({
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
      actions={withActions ? <PartPageActions scope={mode} /> : undefined}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {toolbar(false)}
        <SelectBusinessEmptyState
          icon={Package}
          description="O catálogo de peças, com preços e fornecedores, é de cada empresa."
        />
      </div>
    );
  }

  const query = new URLSearchParams({
    page: String(Number(first(searchParams.page)) || 1),
    pageSize: String(Number(first(searchParams.pageSize)) || 10),
    search: first(searchParams.search) ?? "",
    ...(businessId && { businessId }),
    ...partListQuery(searchParams),
  });

  const list = await fetchMaintenanceList<PartRow, PartSearchMeta>({
    path: "/part/list-part",
    query,
    token,
    tag: "update-part",
    what: "a lista de peças",
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

      <PartStats searchMeta={list.searchMeta} />

      <PartTable
        scope={mode}
        data={list.rows}
        meta={list.meta}
        responseError={list.responseError}
        searchMeta={list.searchMeta}
      />
    </div>
  );
};

export { PartContent };
