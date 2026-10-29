import { Fuel as FuelIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import {
  businessIdQuery,
  scopedBusinessId,
  type FleetScope,
} from "@/features/fuel/lib/scope";

import { FuelTypePageActions } from "../page-actions";
import { FuelTypeStats } from "../stats";
import { FuelTypeTable } from "../table";
import { fuelTypeListQuery } from "../lib/server-table";
import type { FuelTypeListMeta, FuelTypeRow } from "../lib/types";

interface FuelTypeContentProps {
  mode: FleetScope;
  searchParams: Record<string, string | string[] | undefined>;
  token: string;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Tipos de combustível, one screen for /admin and /dashboard (decision 8.7).
 * The admin copy listed every company's catalog mixed in one table; now the
 * MASTER picks the company at the top, and the order is the server's.
 */
const FuelTypeContent = async ({
  mode,
  searchParams,
  token,
}: FuelTypeContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  const businessId =
    mode === "admin"
      ? scopedBusinessId(mode, firstParam(searchParams.businessId), null)
      : undefined;

  const renderHeader = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <FuelTypePageActions scope={mode} /> : undefined}
    />
  );

  if (mode === "admin" && !businessId) {
    return (
      <div className="my-6 space-y-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={FuelIcon}
          description="Os combustíveis que a frota da empresa escolhida usa aparecem aqui."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };
  let rows: FuelTypeRow[] = [];
  let meta: FuelTypeListMeta = { total: 0, page, pageSize };

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...businessIdQuery(mode, businessId),
    ...fuelTypeListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/fuel-type/list-fuel-type?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ["create-fuel-type", "delete-fuel-type", "update-fuel-type"],
        },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de combustíveis",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          {renderHeader(false)}

          <AccessErrorState
            kind={refusal.kind}
            moduleLabel="Gestão de Frota"
            audience={mode === "admin" ? "master" : "company"}
            message={refusal.message}
            // The MASTER's way out on /admin (decision 4.3), as on the
            // refuelings screen. The catalog itself is not module-gated
            // today; the button only shows if that changes.
            action={
              refusal.kind === "module-not-enabled" &&
              mode === "admin" &&
              businessId ? (
                <ManageModulesButton businessId={businessId} />
              ) : undefined
            }
          />
        </div>
      );
    }

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage:
          "Houve um erro ao tentar recuperar a lista de combustíveis",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      rows = data;
      meta = parsedMeta ?? { total: data.length, page, pageSize };
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
      {renderHeader(true)}

      {/* The cards count the company's whole search (the API's searchMeta);
          the month's refuelings only come with Gestão de Frotas. */}
      <FuelTypeStats
        searchMeta={meta.searchMeta}
        total={responseError.error ? undefined : meta.total}
      />

      <FuelTypeTable data={rows} meta={meta} responseError={responseError} />
    </div>
  );
};

export { FuelTypeContent };
