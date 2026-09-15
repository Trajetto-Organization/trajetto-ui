"use client";

import { useSearchParams } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
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
    <div className="space-y-4 my-6">
      {mode === "admin" && (
        <BusinessSelector currentBusinessId={searchParams.businessId} />
      )}

      {businessId ? (
        <ControlTowerPanel businessId={businessId} />
      ) : (
        <div
          className="flex h-72 items-center justify-center rounded-lg
          border-2 border-dashed"
        >
          <p className="text-center text-sm text-muted-foreground">
            Selecione uma empresa para abrir a torre de controle
          </p>
        </div>
      )}
    </div>
  );
};

export { ControlTowerContent };
