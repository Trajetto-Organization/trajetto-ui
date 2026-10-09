import { Truck } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

import { readBusinessIdParam } from "@/lib/business-id-param";

import type { VehicleListMeta, VehicleRow, VehicleScreenMode } from "../types";
import { vehicleListQuery } from "../server-table";
import { fetchFleetList } from "../lib/fetch-list";
import { VehiclePageActions } from "../page-actions";
import { VehicleStats } from "../stats";
import { VehicleTable } from "../table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface VehicleContentProps {
  /** "admin": the MASTER picks the company above; "dashboard": the session's. */
  mode: VehicleScreenMode;
  searchParams: PageSearchParams;
  token: string;
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The vehicle screen for /admin and /dashboard (decision 8.7): the company
 * is the only difference. The list, its cards and its filters are the API's
 * answer for that company as a whole (decision 8.8).
 */
const VehicleContent = async ({
  mode,
  searchParams,
  token,
}: VehicleContentProps): Promise<JSX.Element> => {
  // Only a company id from the URL: it becomes part of API requests.
  const businessId = readBusinessIdParam(single(searchParams.businessId));

  const renderHeader = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? <VehiclePageActions hasData={hasData} /> : undefined
      }
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6" data-tutorial="welcome">
        {renderHeader(false)}
        <SelectBusinessEmptyState
          icon={Truck}
          description="A frota é de cada empresa: escolha acima de qual empresa ver e cadastrar os veículos."
        />
      </div>
    );
  }

  const query = new URLSearchParams({
    page: String(Number(single(searchParams.page)) || 1),
    pageSize: String(Number(single(searchParams.pageSize)) || 10),
    search: single(searchParams.search) || "",
    ...(mode === "admin" && businessId && { businessId }),
    ...vehicleListQuery(searchParams),
  });

  const { rows, meta, responseError, accessError } = await fetchFleetList<
    VehicleRow,
    VehicleListMeta
  >({
    path: "/vehicle/list-vehicle",
    query,
    token,
    entityLabel: "os veículos",
  });

  if (accessError) {
    return (
      <div className="my-6 space-y-6" data-tutorial="welcome">
        {renderHeader(false)}
        <AccessErrorState
          kind={accessError.kind}
          message={accessError.message}
          moduleLabel="Gestão de Frota"
          audience={mode === "admin" ? "master" : "company"}
          // The MASTER's way out of "Módulo não contratado" (decision 4.3).
          action={
            accessError.kind === "module-not-enabled" &&
            mode === "admin" &&
            businessId ? (
              <ManageModulesButton businessId={businessId} />
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    // Keyed by company: switching it in the selector starts the screen over
    // (decision 2.6) instead of keeping the previous company's dialogs.
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true, rows.length > 0)}
      <VehicleStats searchMeta={meta.searchMeta} total={meta.total} />
      <VehicleTable data={rows} meta={meta} responseError={responseError} />
    </div>
  );
};

export { VehicleContent };
