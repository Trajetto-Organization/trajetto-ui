"use client";

import { useSearchParams } from "next/navigation";

import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { useAuthStore } from "@/store/auth-store";

import { ControlTowerPanel } from "../panel";

interface ControlTowerContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  searchParams: { businessId?: string };
}

/**
 * The tower is one client surface: a map, four widgets and a socket.
 *
 * Nothing here is server-rendered. The map cannot be — Leaflet touches
 * `window` at import time — and rendering the widgets on the server while the
 * map loaded on the client would hand a dispatcher a page that arrives in two
 * pieces at two different moments.
 */
const ControlTowerContent = ({
  mode,
  searchParams,
}: ControlTowerContentProps): JSX.Element => {
  const params = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  const businessId = params.get("businessId") || storeBusinessId || undefined;

  return (
    <div className="my-6 space-y-6">
      {/*
        The same band Rotas and Entregas use, and for the same reason: three
        pages that all begin by asking "whose operation?" should not each
        answer with their own margins. The toolbar carries no actions here —
        the tower's controls live on the map — so it renders the selector and
        nothing else.
      */}
      <ProtectedPageToolbar
        context={
          mode === "admin" ? (
            <BusinessSelector currentBusinessId={searchParams.businessId} />
          ) : undefined
        }
      />

      {businessId ? (
        <ControlTowerPanel businessId={businessId} />
      ) : (
        <EmptyState
          icon={Building2}
          title="Selecione uma empresa"
          description="A torre acompanha os veículos de uma operação por vez; escolha a empresa acima."
        />
      )}
    </div>
  );
};

export { ControlTowerContent };
