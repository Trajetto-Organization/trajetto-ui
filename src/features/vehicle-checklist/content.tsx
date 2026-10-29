import { ClipboardCheck } from "lucide-react";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

import { readBusinessIdParam } from "@/lib/business-id-param";

import type { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";

import { fetchFleetList } from "@/features/vehicle/lib/fetch-list";

import { checklistListQuery, type ChecklistSearchMeta } from "./server-table";
import { ChecklistStats } from "./stats";
import { VehicleChecklistPageActions } from "./page-actions";
import { VehicleChecklistTable } from "./table";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface VehicleChecklistContentProps {
  mode: "admin" | "dashboard";
  searchParams: PageSearchParams;
  token: string;
}

interface ChecklistListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: ChecklistSearchMeta;
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The inspections of one company, for /admin and /dashboard (decision 8.7):
 * list, cards and filters answered by the API for the whole company (8.8).
 */
const VehicleChecklistContent = async ({
  mode,
  searchParams,
  token,
}: VehicleChecklistContentProps): Promise<JSX.Element> => {
  const businessId = readBusinessIdParam(single(searchParams.businessId));

  const renderHeader = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? (
          <VehicleChecklistPageActions hasData={hasData} />
        ) : undefined
      }
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6" data-tutorial="welcome">
        {renderHeader(false)}
        <SelectBusinessEmptyState
          icon={ClipboardCheck}
          description="As inspeções são de cada empresa: escolha acima de qual empresa ver os checklists."
        />
      </div>
    );
  }

  const query = new URLSearchParams({
    page: String(Number(single(searchParams.page)) || 1),
    pageSize: String(Number(single(searchParams.pageSize)) || 10),
    search: single(searchParams.search) || "",
    ...(mode === "admin" && businessId && { businessId }),
    ...checklistListQuery(searchParams),
  });

  const { rows, meta, responseError, accessError } = await fetchFleetList<
    vehicleChecklistTableSchema,
    ChecklistListMeta
  >({
    path: "/vehicle-checklist/list-vehicle-checklist",
    query,
    token,
    entityLabel: "os checklists veiculares",
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
      {renderHeader(true, rows.length > 0)}
      <ChecklistStats searchMeta={meta.searchMeta} />
      <VehicleChecklistTable
        data={rows}
        meta={meta}
        responseError={responseError}
      />
    </div>
  );
};

export { VehicleChecklistContent };
