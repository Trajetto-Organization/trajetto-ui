import { useEffect, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, Loader } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import { useServiceOrderInfiniteScroll } from "./hooks/service-order-infinite-scroll";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { formatDate } from "@/lib/format-values";
import { SearchServiceOrderProps } from "./dto";

const SearchServiceOrder = ({
  errorServiceOrderId,
  searchServiceOrderInputValue,
  businessId,
  handleUpdateSearchServiceOrderInputValue,
  isOptional,
}: SearchServiceOrderProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    serviceOrders,
    lastElementRef: lastServiceOrderRef,
    isLoading: isLoadingServiceOrders,
    isFetching: isFetchingServiceOrders,
    refetch: refetchServiceOrders,
    hasError,
    errorMessage,
  } = useServiceOrderInfiniteScroll(businessId);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingServiceOrders || isFetchingServiceOrders) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingServiceOrders, isFetchingServiceOrders, hasError]);

  // Function to format the display text for each service order
  const formatServiceOrderDisplay = (serviceOrder: any) => {
    // Format the date in a readable way
    const formattedDate =
      formatDate(serviceOrder.date, "pt-BR") || serviceOrder.date;

    // Get vehicle info if available
    const vehicleInfo = serviceOrder.vehicle.license_plate
      ? `(Veículo: ${serviceOrder.vehicle.description || ""} - Placa: ${serviceOrder.vehicle.license_plate})`
      : "";

    // Use the last 12 characters from UUID for maximum uniqueness and randomness
    // This avoids UUIDv7 timestamp conflicts and ensures true randomization
    return `OS#${serviceOrder.id.slice(-12)} - ${formattedDate} ${vehicleInfo}`;
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor="search-service-order-input"
        className={errorServiceOrderId ? "text-red-500" : ""}
      >
        {errorServiceOrderId
          ? errorServiceOrderId[0]
          : "Selecione a ordem de serviço"}{" "}
        {isOptional && "(opcional)"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput
          id="search-service-order-input"
          placeholder="Buscar ordem de serviço..."
          className="h-9"
        />

        {!isLoadingServiceOrders && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">
              Nenhuma ordem de serviço disponível
            </div>
          </CommandEmpty>
        )}

        <CommandList
          className="max-h-[280px] [&::-webkit-scrollbar]:w-2 
          [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent 
          [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm 
          [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground [&]:scrollbar-thin 
          [&]:scrollbar-track-transparent [&]:scrollbar-thumb-border"
        >
          <CommandGroup>
            {hasError && (
              <div
                className="absolute inset-0 flex flex-col 
                px-6 items-center justify-center text-center"
              >
                {errorMessage || "Erro ao carregar as ordens de serviço"}
                <Button
                  className="h-8 mt-2"
                  variant={"outline"}
                  type="button"
                  onClick={() => refetchServiceOrders()}
                >
                  Revalidar Ordem de Serviço
                </Button>
              </div>
            )}

            {serviceOrders?.map((serviceOrder) => {
              const displayText = formatServiceOrderDisplay(serviceOrder);

              return (
                <CommandItem
                  key={serviceOrder.id}
                  ref={lastServiceOrderRef}
                  value={displayText}
                  onSelect={() => {
                    handleUpdateSearchServiceOrderInputValue({
                      serviceOrderId: serviceOrder.id,
                      searchServiceOrderInputValue: displayText,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span className="truncate max-w-full">{displayText}</span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchServiceOrderInputValue === displayText
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              );
            })}

            {isFetchingServiceOrders &&
              serviceOrders &&
              serviceOrders.length > 0 &&
              !hasError && <Skeleton className="w-full h-7" />}

            {showSpinner && !serviceOrders?.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando ordens de serviço...
                  </span>
                </div>
              </div>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export { SearchServiceOrder };
