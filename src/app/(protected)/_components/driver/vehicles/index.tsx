"use client";

import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { commandKeywordFilter } from "@/lib/command-keyword-filter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Loader } from "lucide-react";
import { VehicleActionModal } from "./vehicle-action-modal";
import { driverVehicleOptions } from "./vehicle-action-modal/options";

import { displayValue } from "@/lib/format-values";
import { useAuthStore } from "@/store/auth-store";
import { useDriverVehicles } from "./hooks";
import { showsMaintenanceFields } from "@/features/vehicle/lib/form-values";

const DriverVehiclesList = (): JSX.Element => {
  const router = useRouter();

  // Kept fresh by the security check: a module switched off while the page
  // is open takes its options away without a reload.
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  // Revision data belongs to Gestão de Frotas; without it the interval is a
  // stored default, not information.
  const withMaintenance = showsMaintenanceFields({ role, enabledModules });

  const options = driverVehicleOptions({
    role: role ?? "BUSINESS_USER",
    enabledModules,
  });

  // Nothing to offer (no FLEET): the card is information only.
  const hasOptions = options.length > 0;
  const {
    errorMessage,
    isModalOpen,
    lastElementRef,
    refetch,
    selectedVehicle,
    setIsModalOpen,
    setSelectedVehicle,
    showSpinner,
    vehicles,
    hasError,
    isFetching,
    isLoading,
    isLoaded,
  } = useDriverVehicles();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 hover:bg-green-300";
      case "IN_ROUTE":
        return "bg-blue-100 text-blue-800 hover:bg-blue-300";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 hover:bg-gray-300";
      case "BLOCKED":
        return "bg-red-100 text-red-800 hover:bg-red-300";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Ativo";
      case "IN_ROUTE":
        return "Em Rota";
      case "INACTIVE":
        return "Inativo";
      case "BLOCKED":
        return "Bloqueado";
      default:
        return "Desconhecido";
    }
  };

  const formatMileage = (mileage: number | null | undefined): string => {
    if (mileage === null || mileage === undefined) return "N/A";
    return mileage.toLocaleString("pt-BR") + " km";
  };

  const getYearFromDate = (
    dateString: string | Date | null | undefined,
  ): string => {
    if (!dateString) return "N/A";

    try {
      const year = new Date(dateString).getFullYear();
      return isNaN(year) ? "N/A" : year.toString();
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="space-y-6 mt-7">
      {/* Command Search */}
      <Command
        filter={commandKeywordFilter}
        className="border rounded-md"
        data-tutorial="driver-vehicles"
      >
        <CommandInput placeholder="Buscar veículo por placa, descrição, marca ou modelo..." />

        {isLoaded && !isLoading && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhum veículo disponível</div>
          </CommandEmpty>
        )}

        <CommandList className="max-h-none p-4">
          <CommandGroup>
            {hasError && (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-destructive">
                  {errorMessage || "Erro ao carregar os veículos"}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Vehicle Cards Grid */}
            {!hasError && vehicles && vehicles.length > 0 && (
              <div
                className="grid grid-cols-1
                lg:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {vehicles.map((vehicle, index) => {
                  const isLastElement = index === vehicles.length - 1;
                  const isDisabled =
                    vehicle.status === "INACTIVE" ||
                    vehicle.status === "BLOCKED";

                  const isActionable =
                    hasOptions &&
                    !isDisabled &&
                    (vehicle.status === "ACTIVE" ||
                      vehicle.status === "IN_ROUTE");

                  return (
                    <CommandItem
                      key={vehicle.id}
                      // The id, never the text: cmdk merges items with equal
                      // values. The keywords keep the search box matching
                      // what the card shows.
                      value={vehicle.id}
                      keywords={[
                        vehicle.license_plate,
                        vehicle.description,
                        vehicle.brand,
                        vehicle.model,
                      ]
                        .filter(Boolean)
                        .map(String)}
                      ref={isLastElement ? lastElementRef : null}
                      className="p-0 aria-selected:bg-transparent"
                    >
                      <Card
                        className={`w-full p-4 transition-all ${
                          isDisabled
                            ? "border-border opacity-60 cursor-not-allowed"
                            : isActionable
                              ? "border-border cursor-pointer hover:shadow-lg hover:border-primary/50"
                              : "border-border"
                        }`}
                        onClick={() => {
                          if (isActionable) {
                            setSelectedVehicle({
                              id: vehicle.id,
                              brand: vehicle.brand,
                              model: vehicle.model,
                              license_plate: vehicle.license_plate,
                            });
                            setIsModalOpen(true);
                          }
                        }}
                      >
                        {/* Header: Brand/Model and Status */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">
                              {displayValue(vehicle.brand)} |{" "}
                              {displayValue(vehicle.model)}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {getYearFromDate(vehicle.model_year)} •{" "}
                              {displayValue(vehicle.description)}
                            </p>
                          </div>
                          <Badge
                            className={`px-3 py-1 rounded-full ${getStatusColor(
                              vehicle.status || "INACTIVE",
                            )}`}
                          >
                            <span className="text-xs font-medium">
                              {getStatusText(vehicle.status || "INACTIVE")}
                            </span>
                          </Badge>
                        </div>

                        {/* License Plate */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-muted-foreground
                            uppercase tracking-wide mb-1"
                          >
                            Placa
                          </p>
                          <p className="text-base font-semibold text-foreground">
                            {displayValue(vehicle.license_plate)}
                          </p>
                        </div>

                        {/* Mileage Information */}
                        <div className="flex justify-between items-end">
                          <div>
                            <p
                              className="text-xs text-muted-foreground
                              uppercase tracking-wide mb-1"
                            >
                              Quilometragem Atual
                            </p>
                            <p className="text-base font-semibold text-foreground">
                              {formatMileage(vehicle.current_mileage)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p
                              className="text-xs text-muted-foreground
                              uppercase tracking-wide mb-1"
                            >
                              Combustível
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {displayValue(vehicle.fuelType?.description)}
                            </p>
                          </div>
                        </div>

                        {/* Maintenance info: Gestão de Frotas only. */}
                        {withMaintenance && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex justify-between">
                              <div>
                                <p
                                  className="text-xs text-muted-foreground
                                  uppercase tracking-wide mb-1"
                                >
                                  Última Manutenção
                                </p>
                                <p className="text-sm text-foreground">
                                  {formatMileage(
                                    vehicle.last_maintenance_mileage,
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className="text-xs text-muted-foreground
                                  uppercase tracking-wide mb-1"
                                >
                                  Intervalo
                                </p>
                                <p className="text-sm text-foreground">
                                  {formatMileage(
                                    vehicle.maintenance_interval_km,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Hint */}
                        {isActionable ? (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-center text-primary text-sm font-medium">
                              Toque para ver as opções ⚡
                            </p>
                          </div>
                        ) : null}

                        {/* Disabled State Message */}
                        {isDisabled ? (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-center text-muted-foreground text-sm font-medium">
                              {vehicle.status === "BLOCKED"
                                ? "🚫 Veículo bloqueado"
                                : "⏸️ Veículo inativo"}
                            </p>
                          </div>
                        ) : null}
                      </Card>
                    </CommandItem>
                  );
                })}
              </div>
            )}

            {/* Loading More Skeleton */}
            {isFetching && vehicles && vehicles.length > 0 && !hasError && (
              <div
                className="grid grid-cols-1
                lg:grid-cols-2 xl:grid-cols-3
                gap-4 mt-4"
              >
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-10 w-full mt-4" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CommandGroup>

          {/* Initial Loading State */}
          {showSpinner && !vehicles?.length && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando veículos...
                </span>
              </div>
            </div>
          )}
        </CommandList>
      </Command>

      {/* Vehicle Action Modal */}
      <VehicleActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehicle={selectedVehicle}
        options={options}
        onSelect={(href) => router.push(href)}
      />
    </div>
  );
};

export { DriverVehiclesList };
