"use client";

import { useSearchParams } from "next/navigation";

import { RadioTower } from "lucide-react";

import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { useSessionCompany } from "@/store/session-company";
import { Skeleton } from "@/components/ui/skeleton";
import { readBusinessIdParam } from "@/lib/business-id-param";

import type { MapTiles } from "../lib/map-tiles";
import { ControlTowerPageActions } from "../page-actions";
import { ControlTowerPanel } from "../panel";

interface ControlTowerContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  searchParams: { businessId?: string };

  /** The base map, read by the page on the server (decision 7.4). */
  tiles: MapTiles | null;

  /** The app's background-tracking switch, read on the server (decision 7.3). */
  backgroundTracking?: boolean;
}

/**
 * The tower is one client surface: a map, the widgets and a socket.
 *
 * Nothing here is server-rendered. The map cannot be — Leaflet touches
 * `window` at import time — and rendering the widgets on the server while the
 * map loaded on the client would hand a dispatcher a page that arrives in two
 * pieces at two different moments.
 */
const ControlTowerContent = ({
  mode,
  searchParams,
  tiles,
  backgroundTracking = false,
}: ControlTowerContentProps): JSX.Element => {
  const params = useSearchParams();
  const session = useSessionCompany();
  const storeBusinessId = session.businessId;

  // Only /admin picks the company from the URL, and only a company id: it
  // becomes a segment of API paths. On /dashboard it is always the
  // session's — a foreign id left in a copied admin link would otherwise ask
  // for another company and draw a refusal instead of the user's own tower.
  const urlBusinessId =
    mode === "admin"
      ? readBusinessIdParam(params.get("businessId"))
      : undefined;

  const businessId = urlBusinessId || storeBusinessId || undefined;

  // On /dashboard the company is the session's: before the store is seeded
  // the tower is loading, not "choose a company" (store/session-company).
  const companyPending = mode === "dashboard" && !businessId && session.pending;

  return (
    <div className="my-6 space-y-6">
      {/*
        The same band Rotas and Entregas use: the company on the left and
        Atualizar in the actions slot beside it (decision 3.6) —
        h-9 (decision 16.61), full width on a phone. It used to live
        inside the panel, on a line of its own and at another height.
      */}
      <ProtectedPageToolbar
        context={
          mode === "admin" ? (
            <BusinessSelector currentBusinessId={searchParams.businessId} />
          ) : undefined
        }
        actions={businessId ? <ControlTowerPageActions /> : undefined}
      />

      {companyPending ? (
        <div
          className="space-y-4"
          aria-busy="true"
          data-session-company-pending
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : businessId ? (
        // Keyed by company (decision 2.6): a switch remounts the panel, so
        // the framing, the selected driver and the live dots of the previous
        // company go with it (UI-TWR-8).
        <ControlTowerPanel
          key={businessId}
          businessId={businessId}
          mode={mode}
          tiles={tiles}
          backgroundTracking={backgroundTracking}
        />
      ) : (
        <SelectBusinessEmptyState
          icon={RadioTower}
          description="A torre mostra onde os veículos estão agora, o funil de documentos do dia, a pontualidade das saídas e os últimos eventos da operação."
        />
      )}
    </div>
  );
};

export { ControlTowerContent };
