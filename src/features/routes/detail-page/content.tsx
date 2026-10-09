import { Route as RouteIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { readBusinessIdParam } from "@/lib/business-id-param";
import { readAccessError, type AccessError } from "@/lib/access-error";
import { fetchSessionAccess } from "@/lib/session-access";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { EmptyState } from "@/components/shared/custom/empty-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import type { RouteDetailResult } from "@/actions/route/get-route";

import type { MapTiles } from "@/features/control-tower/lib/map-tiles";

import { RouteDetailPageActions } from "./page-actions";
import { RouteDetailView } from "./route-detail-view";

interface RouteDetailContentProps {
  mode: "admin" | "dashboard";
  routeId: string;
  searchParams: Record<string, string | string[] | undefined>;
  token: string;

  /** The base map, read on the server per request (decision 7.4). */
  tiles: MapTiles | null;

  /** Whether the app reports with the screen off (decision 7.3). */
  backgroundTracking: boolean;
}

/**
 * The route's page (decision 14.7, D12): the first read on the server, so the
 * page paints with the route; the client view keeps it live from there.
 */
const RouteDetailContent = async ({
  mode,
  routeId,
  searchParams,
  token,
  tiles,
  backgroundTracking,
}: RouteDetailContentProps): Promise<JSX.Element> => {
  const raw = searchParams.businessId;

  const businessId =
    mode === "admin"
      ? readBusinessIdParam(Array.isArray(raw) ? raw[0] : raw)
      : readBusinessIdParam((await fetchSessionAccess(token))?.businessId);

  const renderHeader = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <RouteDetailPageActions /> : undefined}
    />
  );

  if (!businessId) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={RouteIcon}
          description="A rota pertence a uma empresa: escolha a operação acima."
        />
      </div>
    );
  }

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/route/get-route/${encodeURIComponent(routeId)}/business/${businessId}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
  } catch {
    response = undefined;
  }

  if (response?.status === 401) redirect("/login");

  let accessError: AccessError | null = null;

  if (response?.status === 403) {
    accessError = (await readAccessError(response)) ?? {
      kind: "permission-denied",
      message: null,
    };
  }

  if (accessError) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <AccessErrorState
          kind={accessError.kind}
          moduleLabel="Entregas"
          audience={mode === "admin" ? "master" : "company"}
          message={accessError.message}
          action={
            accessError.kind === "module-not-enabled" && mode === "admin" ? (
              <ManageModulesButton businessId={businessId} />
            ) : undefined
          }
        />
      </div>
    );
  }

  // Another company's route answers 404 like one that does not exist, and
  // the page says the same.
  if (!response || !response.ok) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <EmptyState
          icon={RouteIcon}
          title={
            response?.status === 404
              ? "Rota não encontrada"
              : "Não foi possível carregar a rota"
          }
          description={
            response?.status === 404
              ? "Ela não existe ou não é desta empresa. Volte ao quadro de rotas."
              : "Tente de novo em instantes com o botão Atualizar."
          }
        />
      </div>
    );
  }

  const body = await response.json();

  const initial: RouteDetailResult = {
    route: body.data,
    progress: body.meta?.progress ?? { done: 0, total: 0 },
  };

  return (
    // Keyed by the company (decision 2.6): switching it on /admin remounts.
    <div key={businessId} className="space-y-6 my-6">
      {renderHeader(true)}

      <RouteDetailView
        businessId={businessId}
        routeId={routeId}
        initial={initial}
        tiles={tiles}
        backgroundTracking={backgroundTracking}
        admin={mode === "admin"}
      />
    </div>
  );
};

export { RouteDetailContent };
