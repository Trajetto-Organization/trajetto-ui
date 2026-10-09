import { Shapes } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { fetchFleetList } from "@/features/vehicle/lib/fetch-list";

import type { VehicleTypeListMeta, VehicleTypeRow } from "../types";
import { vehicleTypeListQuery } from "../server-table";
import { VehicleTypePageActions } from "../page-actions";
import { VehicleTypeStats } from "../stats";
import { VehicleTypeTable } from "../table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface VehicleTypeContentProps {
  mode: "admin" | "dashboard";
  searchParams: PageSearchParams;
  token: string;
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The vehicle types of one company, for /admin and /dashboard (decision
 * 8.7). The list is the API's answer for the company, sorted by the server.
 */
const VehicleTypeContent = async ({
  mode,
  searchParams,
  token,
}: VehicleTypeContentProps): Promise<JSX.Element> => {
  const businessId = readBusinessIdParam(single(searchParams.businessId));

  const renderHeader = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <VehicleTypePageActions /> : undefined}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6" data-tutorial="welcome">
        {renderHeader(false)}
        <SelectBusinessEmptyState
          icon={Shapes}
          description="Os tipos de veículo são de cada empresa: escolha acima de qual empresa vê-los e cadastrá-los."
        />
      </div>
    );
  }

  const query = new URLSearchParams({
    page: String(Number(single(searchParams.page)) || 1),
    pageSize: String(Number(single(searchParams.pageSize)) || 10),
    search: single(searchParams.search) || "",
    ...(mode === "admin" && businessId && { businessId }),
    ...vehicleTypeListQuery(searchParams),
  });

  const { rows, meta, responseError, accessError } = await fetchFleetList<
    VehicleTypeRow,
    VehicleTypeListMeta
  >({
    path: "/vehicle-type/list-vehicle-type",
    query,
    token,
    entityLabel: "os tipos de veículo",
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
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true)}
      {/* The cards count the company's whole search (the API's searchMeta). */}
      <VehicleTypeStats
        searchMeta={meta.searchMeta}
        total={responseError.error ? undefined : meta.total}
      />
      <VehicleTypeTable data={rows} meta={meta} responseError={responseError} />
    </div>
  );
};

export { VehicleTypeContent };
