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

import { Loader, Receipt } from "lucide-react";
import {
  formatToBrazilianCurrency,
  formatDate,
  displayValue,
  formatNotificationDate,
} from "@/lib/format-values";

import type { AccountPayableStatus } from "./account-payable.types";
import { useDriverAccountPayableList } from "./hooks";

const DriverAccountPayableList = (): JSX.Element => {
  const {
    showSpinner,
    accountPayables,
    lastElementRef,
    refetch,
    errorMessage,
    isLoaded,
    hasError,
    isFetching,
    isLoading,
  } = useDriverAccountPayableList();

  // Helper function to calculate account payable status
  const calculateAccountPayableStatus = (
    amount: number,
    amountPaid: number | null,
    dueDate: Date | string,
    paymentDate: Date | string | null,
  ): AccountPayableStatus => {
    let status: AccountPayableStatus = "PENDING";

    const currentDate = new Date();
    const dueDateObj = new Date(dueDate);

    const isOverdue = currentDate > dueDateObj;

    if (paymentDate) {
      const paid = amountPaid || 0;
      const paymentDateObj = new Date(paymentDate);

      const isPaidLate = paymentDateObj > dueDateObj;

      if (paid >= amount) {
        status = isPaidLate ? "LATE" : "PAID";
      } else if (paid > 0) {
        status = isPaidLate || isOverdue ? "PARTIAL_LATE" : "PARTIAL";
      }
    } else {
      status = isOverdue ? "OVERDUE" : "PENDING";
    }

    return status;
  };

  // Helper function to translate status to Portuguese
  const translateAccountPayableStatus = (
    status: AccountPayableStatus,
  ): string => {
    const translations: Record<AccountPayableStatus, string> = {
      PENDING: "Pendente",
      PAID: "Pago",
      PARTIAL: "Parcial",
      LATE: "Pago com atraso",
      PARTIAL_LATE: "Parcial com atraso",
      OVERDUE: "Vencido",
    };
    return translations[status];
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string; label: string }> = {
      Pendente: {
        className:
          "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
        label: "Pendente",
      },
      Pago: {
        className:
          "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
        label: "Pago",
      },
      "Pago com atraso": {
        className:
          "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
        label: "Pago c/ Atraso",
      },
      Vencido: {
        className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
        label: "Vencido",
      },
      Parcial: {
        className:
          "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
        label: "Parcial",
      },
      "Parcial com atraso": {
        className:
          "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
        label: "Parcial c/ Atraso",
      },
    };

    const statusInfo = statusMap[status];
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6 mt-7">
      {/* Command Search */}
      <Command className="border rounded-md">
        <CommandInput placeholder="Buscar conta a pagar por fornecedor, ordem de serviço..." />

        {isLoaded && !isLoading && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">
              Nenhuma conta a pagar encontrada
            </div>
          </CommandEmpty>
        )}

        <CommandList className="max-h-none p-4">
          <CommandGroup>
            {hasError && (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-destructive">
                  {errorMessage || "Erro ao carregar as contas a pagar"}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Account Payable Cards Grid */}
            {!hasError && accountPayables && accountPayables.length > 0 && (
              <div
                className="grid grid-cols-1
                md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {accountPayables.map((accountPayable: any, index: number) => {
                  const isLastElement = index === accountPayables.length - 1;

                  // Calculate status and remaining amount
                  const rawStatus = calculateAccountPayableStatus(
                    accountPayable.amount,
                    accountPayable.amount_paid,
                    accountPayable.due_date,
                    accountPayable.payment_date,
                  );

                  const translatedStatus =
                    translateAccountPayableStatus(rawStatus);
                  const remainingAmount =
                    accountPayable.amount - (accountPayable.amount_paid || 0);

                  // Format service order description
                  const serviceOrderDescription = accountPayable.serviceOrder
                    ? (() => {
                        const formattedDate =
                          formatDate(
                            accountPayable.serviceOrder.date,
                            "pt-BR",
                          ) || accountPayable.serviceOrder.date;

                        const vehicleInfo = accountPayable.serviceOrder.vehicle
                          ?.license_plate
                          ? `(Veículo: ${accountPayable.serviceOrder.vehicle.description || ""} - Placa: ${accountPayable.serviceOrder.vehicle.license_plate})`
                          : "";

                        return `OS#${accountPayable.serviceOrder.id.slice(-12)} - ${formattedDate} ${vehicleInfo}`;
                      })()
                    : null;

                  return (
                    <CommandItem
                      key={accountPayable.id}
                      ref={isLastElement ? lastElementRef : null}
                      className="p-0 aria-selected:bg-transparent"
                    >
                      <Card className="w-full p-4 transition-all hover:shadow-lg">
                        {/* Header: Date and Status */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Emitido em:
                              </p>
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {displayValue(
                                  formatNotificationDate(
                                    accountPayable.issue_date,
                                    "pt-BR",
                                  ),
                                )}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(translatedStatus)}
                        </div>

                        {/* Due Date */}
                        <div className="mb-3">
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Data de Vencimento
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {displayValue(
                              formatDate(accountPayable.due_date, "pt-BR"),
                            )}
                          </p>
                        </div>

                        {/* Amount, Amount Paid and Remaining Amount */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
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
                                  accountPayable.amount,
                                ),
                              )}
                            </p>
                          </div>
                          <div className="text-center">
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Valor Pago
                            </p>
                            <p className="text-base font-semibold text-green-600">
                              {displayValue(
                                accountPayable.amount_paid !== null
                                  ? formatToBrazilianCurrency(
                                      accountPayable.amount_paid,
                                    )
                                  : null,
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-xs text-gray-500
                              uppercase tracking-wide mb-1"
                            >
                              Restante
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {displayValue(
                                formatToBrazilianCurrency(remainingAmount),
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Data de Pagamento
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {displayValue(
                              accountPayable.payment_date
                                ? formatDate(
                                    accountPayable.payment_date,
                                    "pt-BR",
                                  )
                                : null,
                            )}
                          </p>
                        </div>

                        {/* Branch and Service Order */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="text-xs mb-2 truncate">
                            <span className="text-gray-500">Filial: </span>
                            <span className="font-medium text-gray-900">
                              {displayValue(
                                accountPayable.branch?.corporate_reason ||
                                  accountPayable.branch?.fantasy_name,
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between text-xs">
                            <div className="w-full gap-2 truncate">
                              <span className="text-gray-500">
                                Ordem de Serviço:{" "}
                              </span>
                              <span
                                className="font-medium
                                text-gray-900"
                              >
                                {displayValue(serviceOrderDescription)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Responsible User */}
                        <div
                          className="mt-3 pt-3
                          border-t border-gray-100"
                        >
                          <p
                            className="text-xs text-gray-500
                            uppercase tracking-wide mb-1"
                          >
                            Responsável pelo Registro
                          </p>
                          <p className="text-sm text-gray-700">
                            {displayValue(
                              accountPayable.registrationUser?.name,
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
              accountPayables &&
              accountPayables.length > 0 &&
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
          {showSpinner && !accountPayables?.length && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando contas a pagar...
                </span>
              </div>
            </div>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export { DriverAccountPayableList };
