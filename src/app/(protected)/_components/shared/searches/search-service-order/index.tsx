import { useEffect, useMemo, useState, useId } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Check, Loader } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { useServiceOrderInfiniteScroll } from "./hooks/service-order-infinite-scroll";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { formatServiceOrderDisplay } from "@/lib/format-values";

import type { SearchServiceOrderProps } from "./search-service-order.types";

const SearchServiceOrder = ({
  errorServiceOrderId,
  searchServiceOrderInputValue,
  businessId,
  handleUpdateSearchServiceOrderInputValue,
  isOptional,
}: SearchServiceOrderProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // What the person typed, sent to the API as `search` (id, description,
  // plate or vehicle): an order outside the loaded pages can still be found
  // (FLEET-SEARCH-1). It used to filter only the rows already on screen.
  const [search, setSearch] = useState<string>("");

  const {
    serviceOrders,
    lastElementRef: lastServiceOrderRef,
    isLoading: isLoadingServiceOrders,
    isFetching: isFetchingServiceOrders,
    refetch: refetchServiceOrders,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useServiceOrderInfiniteScroll(businessId, search);

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

  // While the server's answer for the new term is on its way, the rows on
  // screen are the previous term's: narrow them locally meanwhile, over what
  // the server searches too (the id, the description and the vehicle).
  const visibleServiceOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term || isSearchSettled) return serviceOrders ?? [];

    return (serviceOrders ?? []).filter((serviceOrder: any) =>
      [
        serviceOrder.id,
        serviceOrder.description,
        serviceOrder.vehicle?.license_plate,
        serviceOrder.vehicle?.description,
      ].some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [serviceOrders, search, isSearchSettled]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione a ordem de serviço ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorServiceOrderId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione a ordem de serviço"
          // The server already filtered by the term; cmdk re-filtering its
          // answer by the display text would hide a match on the description.
          shouldFilter={false}
          className={cn(
            "h-[320px] relative border rounded-md",
            control["aria-invalid"] && "border-red-600 dark:border-red-500",
          )}
        >
          <CommandInput
            {...control}
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por placa, descrição ou código..."
            className="h-9"
            aria-label="Buscar ordem de serviço"
          />

          {!isLoadingServiceOrders &&
            !hasError &&
            isSearchSettled &&
            visibleServiceOrders.length === 0 && (
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

              {visibleServiceOrders.map((serviceOrder: any) => {
                const displayText = formatServiceOrderDisplay(serviceOrder);

                return (
                  <CommandItem
                    key={serviceOrder.id}
                    ref={lastServiceOrderRef}
                    // The row's id, never its text: cmdk merges items with equal values, so
                    // two rows with the same text lit up together and Enter chose the first.
                    value={serviceOrder.id}
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
                visibleServiceOrders.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}

              {showSpinner && !visibleServiceOrders.length && (
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
      )}
    </FieldShell>
  );
};

export { SearchServiceOrder };
