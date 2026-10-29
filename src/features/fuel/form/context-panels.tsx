"use client";

import dynamic from "next/dynamic";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { FUEL_MILEAGE_RULES } from "../lib/mileage-rules";

// The map is client-only (Leaflet touches `window` on import).
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/shared/custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[300px] items-center justify-center"
        aria-busy="true"
      >
        Carregando mapa...
      </div>
    ),
  },
);

/**
 * The rules are read BEFORE the fields: the mileage restriction and the
 * vehicle's current mileage are needed while typing, not after the error.
 */
const FUEL_RULES: Record<"create" | "update", readonly string[]> = {
  create: FUEL_MILEAGE_RULES.create,
  update: [
    ...FUEL_MILEAGE_RULES.update,
    "Corrigir preço, litros, data ou observações de um abastecimento antigo é permitido mesmo se o veículo ou o motorista estiverem inativos",
  ],
};

const FuelRulesAlert = ({
  mode,
}: {
  mode: "create" | "update";
}): JSX.Element => (
  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
    <Info className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-700 dark:text-blue-300">
      <strong>Informações importantes:</strong>
      <br />
      {FUEL_RULES[mode].map((rule, index) => (
        <span key={rule}>
          {index > 0 ? <br /> : null}• {rule}
        </span>
      ))}
      <br />• O valor total é calculado automaticamente (litros × preço por
      litro)
    </AlertDescription>
  </Alert>
);

interface VehicleSummaryProps {
  vehicle?: {
    current_mileage: number;
    maintenance_interval_km: number;
    last_maintenance_mileage?: number | null;
  } | null;
}

const VehicleSummary = ({
  vehicle,
}: VehicleSummaryProps): JSX.Element | null => {
  if (!vehicle) return null;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-900/20">
      <p className="text-sm text-green-700 dark:text-green-300">
        <strong>Dados atuais do veículo:</strong>
        <br />
        Quilometragem atual: {vehicle.current_mileage.toLocaleString(
          "pt-BR",
        )}{" "}
        km
        <br />
        Intervalo de manutenção:{" "}
        {vehicle.maintenance_interval_km.toLocaleString("pt-BR")} km
        {vehicle.last_maintenance_mileage ? (
          <>
            <br />
            Última manutenção:{" "}
            {vehicle.last_maintenance_mileage.toLocaleString("pt-BR")} km
          </>
        ) : null}
      </p>
    </div>
  );
};

interface LocationFieldProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lon: number) => void;
  onLoadingChange: (isLoading: boolean) => void;
  disabled: boolean;
  error?: string;
}

const LocationField = (props: LocationFieldProps): JSX.Element => (
  <LocationPicker {...props} />
);

export { FuelRulesAlert, LocationField, VehicleSummary };
