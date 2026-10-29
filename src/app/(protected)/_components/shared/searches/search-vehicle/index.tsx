import { useState, useId } from "react";
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
import { cn } from "@/lib/utils";

import { useVehicleInfiniteScroll } from "./hooks/vehicle-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchVehicleProps } from "./search-vehicle-types";

const SearchVehicle = ({
  errorVehicleId,
  selectedVehicleId,
  businessId,
  handleUpdateSearchVehicleInputValue,
  isOptional,
}: SearchVehicleProps): JSX.Element => {
  const fieldId = useId();

  // The typed term goes to the server (FLEET-SEARCH-1): a plate that is not
  // in the loaded pages used to "not exist" until the list was scrolled.
  const [search, setSearch] = useState<string>("");

  // The rows already narrowed to what is typed: the server's answer, the
  // whole list filtered here, or the previous rows while a term is on its
  // way (useCursorSearch).
  const {
    vehicles,
    lastElementRef: lastVehicleRef,
    isLoading: isLoadingVehicle,
    isFetchingNextPage,
    refetch: refetchVehicles,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useVehicleInfiniteScroll(businessId, search);

  const isSearching = !isSearchSettled && !hasError;
  const isEmpty = !hasError && vehicles.length === 0;

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione o veículo ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorVehicleId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o veículo"
          // The server already matched plate, RENAVAM and model, which are not
          // all in the item text; cmdk would filter them out again.
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
            placeholder="Buscar por placa, descrição, marca ou modelo..."
            className="h-9 pr-6"
            aria-label="Buscar veículo"
          />

          {/* A term on its way: a spinner in the input, not a skeleton
            under the last row that read as one more (highlighted) item. */}
          {isSearching && (
            <Loader
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-2.5 h-4 w-4
              animate-spin text-muted-foreground"
            />
          )}
          <span role="status" className="sr-only">
            {isSearching
              ? "Buscando veículos…"
              : isFetchingNextPage
                ? "Carregando mais veículos…"
                : ""}
          </span>

          {/* Only once the rows answer what is typed: while a term was in
            flight it flashed "nenhum" over rows about to arrive. */}
          {isEmpty && !isLoadingVehicle && isSearchSettled && (
            <CommandEmpty>
              <div className="py-6 text-center">
                {search.trim()
                  ? "Nenhum veículo encontrado."
                  : "Nenhum veículo disponível"}
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
                  {errorMessage || "Erro ao carregar os veículos"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchVehicles()}
                  >
                    Revalidar Veículos
                  </Button>
                </div>
              )}

              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  // The row's id, never its text: cmdk merges items with equal values, so
                  // two rows with the same text lit up together and Enter chose the first.
                  value={vehicle.id}
                  ref={lastVehicleRef}
                  onSelect={() => {
                    handleUpdateSearchVehicleInputValue({
                      vehicleId: vehicle.id,
                      searchVehicleInputValue: vehicle.description,
                      vehicleLicensePlate: vehicle.license_plate,
                    });
                  }}
                  className="cursor-pointer"
                >
                  {vehicle.description}
                  <span className="text-xs text-muted-foreground ml-2">
                    (Placa: {vehicle.license_plate})
                  </span>
                  {selectedVehicleId === vehicle.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* The next page, set apart from the rows and in its own tone:
              `bg-muted` is the colour of the highlighted item. */}
            {isFetchingNextPage && !isEmpty && (
              <div aria-hidden="true" className="px-2 pb-2 pt-1">
                <Skeleton className="h-7 w-full bg-muted-foreground/15" />
              </div>
            )}

            {isEmpty && isLoadingVehicle && (
              <div className="flex items-center justify-center py-8">
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
      )}
    </FieldShell>
  );
};

export { SearchVehicle };
