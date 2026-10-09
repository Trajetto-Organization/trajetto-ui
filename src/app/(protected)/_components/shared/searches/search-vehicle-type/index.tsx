import { useEffect, useState, useId } from "react";
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

import { useVehicleTypeInfiniteScroll } from "./hooks/vehicle-type-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchVehicleTypeProps } from "./search-vehicle-type.types";
import { cn } from "@/lib/utils";

const SearchVehicleType = ({
  errorVehicleTypeId,
  searchVehicleTypeInputValue,
  businessId,
  handleUpdateSearchVehicleTypeInputValue,
  isOptional,
}: SearchVehicleTypeProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // The typed term goes to the server (FLEET-SEARCH-1).
  const [search, setSearch] = useState<string>("");

  const {
    vehicleTypes,
    lastElementRef: lastVehicleTypeRef,
    isLoading: isLoadingVehicleTypes,
    isFetching: isFetchingVehicleTypes,
    refetch: refetchVehicleTypes,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useVehicleTypeInfiniteScroll(businessId, search);

  // Narrowed locally only while the server's answer for the term is on its way.
  const term = search.trim().toLowerCase();
  const shownVehicleTypes =
    isSearchSettled || !term
      ? vehicleTypes
      : vehicleTypes?.filter((vehicleType) =>
          String(vehicleType.description).toLowerCase().includes(term),
        );

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingVehicleTypes || isFetchingVehicleTypes) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingVehicleTypes, isFetchingVehicleTypes, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione o tipo de veículo ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorVehicleTypeId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o tipo de veículo"
          // The list is the server's answer for the term; cmdk must not refilter.
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
            placeholder="Buscar tipo de veículo..."
            className="h-9"
            aria-label="Buscar tipo de veículo"
          />

          {!isLoadingVehicleTypes && !hasError && (
            <CommandEmpty>
              <div className="py-6 text-center">
                Nenhum tipo de veículo disponível
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
                  {errorMessage || "Erro ao carregar os tipos de veículos"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchVehicleTypes()}
                  >
                    Revalidar Tipos de Veículos
                  </Button>
                </div>
              )}

              {shownVehicleTypes?.map((vehicleType) => (
                <CommandItem
                  key={vehicleType.id}
                  ref={lastVehicleTypeRef}
                  // The row's id, never its text: cmdk merges items with equal values, so
                  // two rows with the same text lit up together and Enter chose the first.
                  value={vehicleType.id}
                  onSelect={() => {
                    // The default axles ride along with the choice, so the
                    // vehicle form can prefill them (FLEET-VTYPE-3). A variable,
                    // not a literal: the shared input type does not name them.
                    const choice = {
                      vehicleTypeId: vehicleType.id,
                      searchVehicleTypeInputValue: vehicleType.description,
                      numberOfAxles: vehicleType.number_of_axles as
                        number | undefined,
                    };

                    handleUpdateSearchVehicleTypeInputValue(choice);
                  }}
                  className="cursor-pointer"
                >
                  <span className="truncate max-w-[200px]">
                    {vehicleType.description}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchVehicleTypeInputValue === vehicleType.description
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}

              {isFetchingVehicleTypes &&
                vehicleTypes &&
                vehicleTypes.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}
            </CommandGroup>

            {showSpinner && !vehicleTypes?.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando tipos de veículos...
                  </span>
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      )}
    </FieldShell>
  );
};

export { SearchVehicleType };
