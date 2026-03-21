"use client";

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

import type { DriverServiceOrdersListProps } from "./service-orders.types";
import { Loader, Wrench } from "lucide-react";

import {
  displayValue,
  formatToBrazilianCurrency,
  formatDate,
  formatNotificationDate,
} from "@/lib/format-values";
import { useDriverServiceOrdersList } from "./hooks";

const DriverServiceOrdersList = ({
  vehicleId,
}: DriverServiceOrdersListProps): JSX.Element => {
  const {
    errorMessage,
    hasError,
    isFetching,
    isLoading,
    lastElementRef,
    refetch,
    serviceOrders,
    showSpinner,
    isLoaded,
  } = useDriverServiceOrdersList(vehicleId);

  const getMaintenanceTypeBadge = (type: string) => {
    if (type === "INTERNAL") {
      return (
        <Badge
          className="bg-blue-100
          text-blue-800 hover:bg-blue-300"
        >
          Interna
        </Badge>
      );
    }

    return (
      <Badge
        className="bg-purple-100
        text-purple-800 hover:bg-purple-300"
      >
        Externa
      </Badge>
    );
  };

  const getStatusBadge = (completionDate: Date | string | null | undefined) => {
    if (completionDate) {
      return (
        <Badge
          className="bg-green-100
          text-green-800 hover:bg-green-300"
        >
          Concluída
        </Badge>
      );
    }

    return (
      <Badge
        className="bg-yellow-100
        text-yellow-800 hover:bg-yellow-300"
      >
        Em Andamento
      </Badge>
    );
  };

  return (
    <div className="space-y-6 mt-7">
      {/* Command Search */}
      <Command className="border rounded-md">
        <CommandInput placeholder="Buscar ordem de serviço por responsável, fornecedor..." />

        {isLoaded && !isLoading && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">
              Nenhuma ordem de serviço encontrada
            </div>
          </CommandEmpty>
        )}

        <CommandList className="max-h-none p-4">
          <CommandGroup>
            {hasError && (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-destructive">
                  {errorMessage || "Erro ao carregar as ordens de serviço"}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Service Order Cards Grid */}
            {!hasError && serviceOrders && serviceOrders.length > 0 && (
              <div
                className="grid grid-cols-1
                md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {serviceOrders.map((serviceOrder: any, index: number) => {
                  const isLastElement = index === serviceOrders.length - 1;

                  return (
                    <CommandItem
                      key={serviceOrder.id}
                      ref={isLastElement ? lastElementRef : null}
                      className="p-0 aria-selected:bg-transparent"
                    >
                      <Card className="w-full p-4 transition-all hover:shadow-lg">
                        {/* Header: Date and Status */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Registrado em:
                              </p>
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {displayValue(
                                  formatNotificationDate(
                                    serviceOrder.created_at,
                                    "pt-BR",
                                  ),
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {getMaintenanceTypeBadge(
                                  serviceOrder.maintenance_type,
                                )}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(serviceOrder.completion_date)}
                        </div>

                        {/* Service Order Date */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Data da Ordem de Serviço
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {displayValue(
                              formatDate(serviceOrder.date, "pt-BR"),
                            )}
                          </p>
                        </div>

                        {/* Responsible User */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Responsável
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {displayValue(serviceOrder.responsibleUser?.name)}
                          </p>
                        </div>

                        {/* Total Amount and Parts Count */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Valor Total
                            </p>
                            <p className="text-base font-semibold text-primary">
                              {displayValue(
                                formatToBrazilianCurrency(
                                  serviceOrder.total_amount,
                                ),
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Peças
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {displayValue(serviceOrder.parts?.length || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Branch and Supplier */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="text-xs mb-2 truncate">
                            <span className="text-gray-500">Filial: </span>
                            <span className="font-medium text-gray-900">
                              {displayValue(
                                serviceOrder.branch?.corporate_reason,
                              )}
                            </span>
                          </div>

                          <div className="text-xs truncate">
                            <span className="text-gray-500">Fornecedor: </span>
                            <span className="font-medium text-gray-900">
                              {displayValue(serviceOrder.supplier?.name)}
                            </span>
                          </div>
                        </div>

                        <div
                          className="mt-3 pt-3
                          border-t border-gray-100"
                        >
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Data de Conclusão
                          </p>
                          <p className="text-sm text-gray-700">
                            {displayValue(
                              serviceOrder.completion_date
                                ? formatDate(
                                    serviceOrder.completion_date,
                                    "pt-BR",
                                  )
                                : null,
                            )}
                          </p>
                        </div>
                      </Card>
                    </CommandItem>
                  );
                })}
              </div>
            )}

            {/* Loading More Skeleton */}
            {isFetching &&
              serviceOrders &&
              serviceOrders.length > 0 &&
              !hasError && (
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
          {showSpinner && !serviceOrders?.length && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando ordens de serviço...
                </span>
              </div>
            </div>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export { DriverServiceOrdersList };
