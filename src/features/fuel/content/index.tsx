import { Fuel as FuelIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import type { FuelProps } from "@/app/(protected)/_components/shared/common.types";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

import { FuelPageActions } from "../page-actions";
import { FuelStats } from "../stats";
import { FuelTable } from "../table";
import {
  businessIdQuery,
  scopedBusinessId,
  type FleetScope,
} from "../lib/scope";
import {
  fuelListQuery,
  type FuelListSearchMeta,
  type PageSearchParams,
} from "../lib/server-table";

interface FuelContentProps {
  /** "admin": the MASTER picks the company at the top; "dashboard": the session's. */
  mode: FleetScope;
  searchParams: PageSearchParams;
  token: string;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Abastecimentos, one screen for /admin and /dashboard (decision 8.7).
 *
 * The two copies had drifted: the admin one listed every company's
 * refuelings in one table with no selector, the cards of both summed the ten
 * rows on screen, and the filters filtered those ten rows. Now the company
 * is explicit, and order, filters and cards come from the API (8.8).
 */
const FuelContent = async ({
  mode,
  searchParams,
  token,
}: FuelContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  // Only a UUID from the URL, and only on /admin: it names the company the
  // MASTER is looking at. The dashboard's company is the session's (the API
  // pins it), so none is sent from here.
  const businessId =
    mode === "admin"
      ? scopedBusinessId(mode, firstParam(searchParams.businessId), null)
      : undefined;

  const renderHeader = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? (
          <FuelPageActions scope={mode} hasData={hasData} />
        ) : undefined
      }
    />
  );

  const renderAccessError = (error: AccessError) => (
    <div className="my-6 space-y-6">
      {renderHeader(false)}

      <AccessErrorState
        kind={error.kind}
        moduleLabel="Gestão de Frota"
        audience={mode === "admin" ? "master" : "company"}
        message={error.message}
        action={
          error.kind === "module-not-enabled" &&
          mode === "admin" &&
          businessId ? (
            <ManageModulesButton businessId={businessId} />
          ) : undefined
        }
      />
    </div>
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={FuelIcon}
          description="Os abastecimentos, os litros e o gasto da frota da empresa escolhida aparecem aqui."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: FuelProps[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: FuelListSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...businessIdQuery(mode, businessId),
    ...fuelListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fuel/list-fuel?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: ["create-fuel", "delete-fuel", "update-fuel"] },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de abastecimentos",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    const refusal = await readAccessError(response);

    if (refusal) return renderAccessError(refusal);

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de abastecimentos",
      };
    } else {
      // NDJSON: an envelope line, then one refueling per line. The cards and
      // the filter options land in `searchMeta` (sendAsNDJSON nests the use
      // case's meta under that key).
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data;
      meta = parsedMeta ?? { total: data.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
    }
  }

  return (
    // Keyed by company: a switch in the selector remounts the client state
    // under it (open dialogs, table state) instead of carrying it over
    // (decision 2.6).
    <div
      key={businessId ?? "session"}
      className="my-6 space-y-6"
      data-tutorial="welcome"
    >
      {renderHeader(true, rows.length > 0)}

      <FuelStats total={meta.total} searchMeta={searchMeta} />

      <FuelTable
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { FuelContent };
