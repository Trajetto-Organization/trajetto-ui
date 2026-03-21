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

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Loader } from "lucide-react";
import { VehicleActionModal } from "./vehicle-action-modal";

import { displayValue } from "@/lib/format-values";
import { useDriverVehicles } from "./hooks";

const DriverVehiclesList = (): JSX.Element => {
  const router = useRouter();
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
      <Command className="border rounded-md">
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
                md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {vehicles.map((vehicle, index) => {
                  const isLastElement = index === vehicles.length - 1;
                  const isDisabled =
                    vehicle.status === "INACTIVE" ||
                    vehicle.status === "BLOCKED";

                  return (
                    <CommandItem
                      key={vehicle.id}
                      ref={isLastElement ? lastElementRef : null}
                      className="p-0 aria-selected:bg-transparent"
                    >
                      <Card
                        className={`w-full p-4 transition-all ${
                          isDisabled
                            ? "border-gray-300 opacity-60 cursor-not-allowed"
                            : "border-gray-200 cursor-pointer hover:shadow-lg hover:border-primary/50"
                        }`}
                        onClick={() => {
                          if (
                            !isDisabled &&
                            (vehicle.status === "ACTIVE" ||
                              vehicle.status === "IN_ROUTE")
                          ) {
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
                            <h3 className="text-lg font-bold text-gray-900 truncate">
                              {displayValue(vehicle.brand)} |{" "}
                              {displayValue(vehicle.model)}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
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
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Placa
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {displayValue(vehicle.license_plate)}
                          </p>
                        </div>

                        {/* Mileage Information */}
                        <div className="flex justify-between items-end">
                          <div>
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Quilometragem Atual
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {formatMileage(vehicle.current_mileage)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Combustível
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                              {displayValue(vehicle.fuelType?.description)}
                            </p>
                          </div>
                        </div>

                        {/* Maintenance Info (if available) */}

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex justify-between">
                            <div>
                              <p
                                className="text-xs text-gray-500
                                uppercase tracking-wide mb-1"
                              >
                                Última Manutenção
                              </p>
                              <p className="text-sm text-gray-700">
                                {formatMileage(
                                  vehicle.last_maintenance_mileage,
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className="text-xs text-gray-500
                                uppercase tracking-wide mb-1"
                              >
                                Intervalo
                              </p>
                              <p className="text-sm text-gray-700">
                                {formatMileage(vehicle.maintenance_interval_km)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Hint */}
                        {vehicle.status === "ACTIVE" ||
                        vehicle.status === "IN_ROUTE" ? (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-center text-primary text-sm font-medium">
                              Toque para ver as opções ⚡
                            </p>
                          </div>
                        ) : null}

                        {/* Disabled State Message */}
                        {isDisabled ? (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-center text-gray-400 text-sm font-medium">
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
                md:grid-cols-2 lg:grid-cols-3
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
        onViewFuels={(vehicleId) => {
          router.push(`/driver/vehicles/${vehicleId}/fuels`);
        }}
        onViewServiceOrders={(vehicleId) => {
          router.push(`/driver/vehicles/${vehicleId}/service-orders`);
        }}
      />
    </div>
  );
};

export { DriverVehiclesList };
