import { useId, useState } from "react";
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

import { useDriverInfiniteScroll } from "./hooks/driver-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchDriverProps } from "./search-driver.types";

/** The last four digits of the CNH, which tell two namesakes apart. */
const cnhTail = (cnh: string | undefined): string => (cnh ?? "").slice(-4);

const SearchDriver = ({
  errorDriverId,
  selectedDriverId,
  businessId,
  handleUpdateSearchDriverInputValue,
  isOptional,
}: SearchDriverProps): JSX.Element => {
  const fieldId = useId();

  // The typed term goes to the server (FLEET-SEARCH-1): with only the loaded
  // pages filtered here, a driver past the first ten could not be found.
  const [search, setSearch] = useState<string>("");

  // The rows already narrowed to what is typed: the server's answer, the
  // whole list filtered here, or the previous rows while a term is on its
  // way (useCursorSearch).
  const {
    drivers,
    lastElementRef: lastDriverRef,
    isLoading: isLoadingDrivers,
    isFetchingNextPage,
    refetch: refetchDrivers,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useDriverInfiniteScroll(businessId, search);

  const isSearching = !isSearchSettled && !hasError;
  const isEmpty = !hasError && drivers.length === 0;

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
    */
    <FieldShell
      label={`Selecione o motorista ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorDriverId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o motorista"
          // The server answers the search; cmdk must not filter it again.
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
            placeholder="Buscar motorista por nome ou CNH..."
            className="h-9 pr-6"
            aria-label="Buscar motorista"
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
              ? "Buscando motoristas…"
              : isFetchingNextPage
                ? "Carregando mais motoristas…"
                : ""}
          </span>

          {isEmpty && !isLoadingDrivers && isSearchSettled && (
            <CommandEmpty>
              <div className="py-6 text-center">
                {search.trim()
                  ? "Nenhum motorista encontrado."
                  : "Nenhum motorista disponível"}
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
                  {errorMessage || "Erro ao carregar os motoristas"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchDrivers()}
                  >
                    Revalidar Motoristas
                  </Button>
                </div>
              )}

              {drivers.map((driver) => (
                <CommandItem
                  key={driver.id}
                  value={driver.id}
                  ref={lastDriverRef}
                  onSelect={() => {
                    handleUpdateSearchDriverInputValue({
                      driverId: driver.id,
                      searchDriverInputValue: driver.name,
                      driverCnh: cnhTail(driver.cnh),
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span className="min-w-0 truncate">{driver.name}</span>
                  {driver.cnh && (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      (CNH: {cnhTail(driver.cnh)})
                    </span>
                  )}
                  {selectedDriverId === driver.id && (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
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

            {isEmpty && isLoadingDrivers && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando motoristas...
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

export { SearchDriver };
