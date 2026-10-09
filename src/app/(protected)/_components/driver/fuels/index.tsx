"use client";

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

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { DriverFuelsListProps } from "./fuels.types";
import { Loader, Fuel as FuelIcon } from "lucide-react";

import {
  formatNotificationDate,
  formatToBrazilianCurrency,
  displayValue,
} from "@/lib/format-values";
import { formatPricePerLiter } from "@/features/fuel/lib/price";
import { formatPickedDay } from "@/features/vehicle/lib/picked-day";
import { useDriverFuelsList } from "./hooks";

/**
 * The driver's own refuelings of one vehicle. The API returns only the
 * caller's (DRV-SCOPE-1), so the cards carry no "Você" badge and no driver
 * name: every card is the driver's.
 */
const DriverFuelsList = ({ vehicleId }: DriverFuelsListProps): JSX.Element => {
  const {
    fuels,
    errorMessage,
    lastElementRef,
    refetch,
    showSpinner,
    hasError,
    isLoading,
    isLoaded,
    isFetching,
  } = useDriverFuelsList(vehicleId);

  return (
    <div className="space-y-6 mt-7">
      {/* Command Search */}
      <Command
        filter={commandKeywordFilter}
        className="border rounded-md"
        data-tutorial="driver-fuels"
      >
        <CommandInput placeholder="Buscar abastecimento..." />

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
                lg:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {fuels.map((fuel: any, index: number) => {
                  const isLastElement = index === fuels.length - 1;

                  return (
                    <CommandItem
                      key={fuel.id}
                      // The id, never the text: cmdk merges items with equal
                      // values. The keywords keep the search box matching
                      // what the card shows.
                      value={fuel.id}
                      keywords={[
                        fuel.fuelType?.description,
                        fuel.notes,
                        formatNotificationDate(fuel.created_at, "pt-BR"),
                      ]
                        .filter(Boolean)
                        .map(String)}
                      ref={isLastElement ? lastElementRef : null}
                      className="p-0 aria-selected:bg-transparent"
                    >
                      <Card className="w-full p-4 transition-all hover:shadow-lg">
                        {/* Header: when it was registered and the fuel */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <FuelIcon className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Registrado em:
                              </p>
                              <p
                                className="text-sm font-semibold 
                                text-foreground truncate"
                              >
                                {displayValue(
                                  formatNotificationDate(
                                    fuel.created_at,
                                    "pt-BR",
                                  ),
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {displayValue(fuel.fuelType?.description)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Refueling Date */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-muted-foreground
                            uppercase tracking-wide mb-1"
                          >
                            Data do Abastecimento
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {/* A picked day, read as the day it means. */}
                            {displayValue(formatPickedDay(fuel.refueling_date))}
                          </p>
                        </div>

                        {/* Amount and Price */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p
                              className="text-xs text-muted-foreground
                              uppercase tracking-wide mb-1"
                            >
                              Litros
                            </p>
                            <p className="text-base font-semibold text-foreground">
                              {displayValue(
                                fuel.liters_amount != null
                                  ? `${fuel.liters_amount.toFixed(3).replace(".", ",")} L`
                                  : null,
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-xs text-muted-foreground
                              uppercase tracking-wide mb-1"
                            >
                              Total
                            </p>
                            <p className="text-base font-semibold text-primary">
                              {displayValue(
                                formatToBrazilianCurrency(fuel.total_amount),
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Mileage and Price per Liter */}
                        <div className="pt-3 border-t border-border">
                          <div className="flex justify-between text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                KM:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {displayValue(
                                  fuel.current_mileage != null
                                    ? fuel.current_mileage.toLocaleString(
                                        "pt-BR",
                                      )
                                    : null,
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Preço/L:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {/* Decimal(10,3): R$ 5,899, as the pump shows. */}
                                {fuel.price_per_liter != null
                                  ? formatPricePerLiter(fuel.price_per_liter)
                                  : displayValue(null)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <p
                            className="text-xs text-muted-foreground
                            uppercase tracking-wide mb-1"
                          >
                            Observações
                          </p>
                          <p
                            className="text-sm text-foreground
                            line-clamp-2 w-full truncate"
                          >
                            {displayValue(fuel.notes)}
                          </p>
                        </div>
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
                lg:grid-cols-2 xl:grid-cols-3 mt-4"
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
