"use client";

import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { useFuelInfiniteScroll } from "../../search-fuel/hooks/fuel-infinite-scroll";

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

import { Loader, Fuel as FuelIcon } from "lucide-react";

import {
  formatDate,
  formatNotificationDate,
  formatToBrazilianCurrency,
  displayValue,
} from "@/lib/format-values";

interface DriverFuelsListProps {
  vehicleId: string;
  driverId: string;
}

const DriverFuelsList = ({
  vehicleId,
  driverId,
}: DriverFuelsListProps): JSX.Element => {
  const { businessId, isLoaded } = useAuthStore();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    fuels,
    lastElementRef,
    isFetching,
    isLoading,
    refetch,
    hasError,
    errorMessage,
  } = useFuelInfiniteScroll(vehicleId, businessId!);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    // Show spinner while auth is loading OR while data is loading
    if (!isLoaded || isLoading || isFetching) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoading, isFetching, hasError, isLoaded]);

  // Initialize spinner as true to avoid blank screen
  useEffect(() => {
    setShowSpinner(true);
  }, []);

  return (
    <div className="space-y-6 mt-7">
      {/* Command Search */}
      <Command className="border rounded-md">
        <CommandInput placeholder="Buscar abastecimento por motorista..." />

        {isLoaded && !isLoading && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">
              Nenhum abastecimento encontrado
            </div>
          </CommandEmpty>
        )}

        <CommandList className="max-h-none p-4">
          <CommandGroup>
            {hasError && (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-destructive">
                  {errorMessage || "Erro ao carregar os abastecimentos"}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Fuel Cards Grid */}
            {!hasError && fuels && fuels.length > 0 && (
              <div
                className="grid grid-cols-1 
                md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {fuels.map((fuel: any, index: number) => {
                  const isLastElement = index === fuels.length - 1;
                  const isCurrentUser = fuel.driverId === driverId;

                  return (
                    <CommandItem
                      key={fuel.id}
                      ref={isLastElement ? lastElementRef : null}
                      className="p-0 aria-selected:bg-transparent"
                    >
                      <Card className="w-full p-4 transition-all hover:shadow-lg">
                        {/* Header: Date and Driver Badge */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <FuelIcon className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Registrado em:
                              </p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatNotificationDate(
                                  fuel.created_at,
                                  "pt-BR",
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {displayValue(fuel.fuelType?.description)}
                              </p>
                            </div>
                          </div>
                          {isCurrentUser && (
                            <Badge
                              className="bg-blue-100 text-blue-800
                              hover:bg-blue-300"
                            >
                              Você
                            </Badge>
                          )}
                        </div>

                        {/* Refueling Date */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Data do Abastecimento
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(fuel.refueling_date, "pt-BR")}
                          </p>
                        </div>

                        {/* Driver Info */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Motorista
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {displayValue(fuel.driver?.name)}
                          </p>
                        </div>

                        {/* Amount and Price */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Litros
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {fuel.liters_amount?.toFixed(3).replace(".", ",")}{" "}
                              L
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Total
                            </p>
                            <p className="text-base font-semibold text-primary">
                              {formatToBrazilianCurrency(fuel.total_amount)}
                            </p>
                          </div>
                        </div>

                        {/* Mileage and Price per Liter */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex justify-between text-xs">
                            <div>
                              <span className="text-gray-500">KM: </span>
                              <span className="font-medium text-gray-900">
                                {fuel.current_mileage?.toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Preço/L: </span>
                              <span className="font-medium text-gray-900">
                                {formatToBrazilianCurrency(
                                  fuel.price_per_liter,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Notes if available */}
                        {fuel.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Observações
                            </p>
                            <p
                              className="text-sm text-gray-700
                              line-clamp-2 w-full truncate"
                            >
                              {fuel.notes}
                            </p>
                          </div>
                        )}
                      </Card>
                    </CommandItem>
                  );
                })}
              </div>
            )}

            {/* Loading More Skeleton */}
            {isFetching && fuels && fuels.length > 0 && !hasError && (
              <div
                className="grid grid-cols-1 gap-4
                md:grid-cols-2 lg:grid-cols-3 mt-4"
              >
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CommandGroup>

          {/* Initial Loading State */}
          {showSpinner && !fuels?.length && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando abastecimentos...
                </span>
              </div>
            </div>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export { DriverFuelsList };
