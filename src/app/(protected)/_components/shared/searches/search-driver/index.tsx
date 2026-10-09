import { useEffect, useId, useMemo, useState } from "react";
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

/**
 * Whether a loaded driver matches what is typed, for the moment between a
 * keystroke and the server's answer. The server searches name and CNH.
 */
function matchesTyped(
  driver: { name: string; cnh?: string },
  typed: string,
): boolean {
  const term = typed.trim().toLowerCase();

  if (!term) return true;

  return [driver.name, driver.cnh ?? ""].some((value) =>
    value.toLowerCase().includes(term),
  );
}

const SearchDriver = ({
  errorDriverId,
  selectedDriverId,
  businessId,
  handleUpdateSearchDriverInputValue,
  isOptional,
}: SearchDriverProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // The typed term goes to the server (FLEET-SEARCH-1): with only the loaded
  // pages filtered here, a driver past the first ten could not be found.
  const [search, setSearch] = useState<string>("");

  const {
    drivers,
    lastElementRef: lastDriverRef,
    isLoading: isLoadingDrivers,
    isFetching: isFetchingDrivers,
    refetch: refetchDrivers,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useDriverInfiniteScroll(businessId, search);

  // While the answer for the new term is on its way, the previous rows are
  // narrowed locally; once it lands, the server's answer is shown as it is.
  const visibleDrivers = useMemo(
    () =>
      isSearchSettled
        ? (drivers ?? [])
        : (drivers ?? []).filter((driver) => matchesTyped(driver, search)),
    [drivers, isSearchSettled, search],
  );

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingDrivers || isFetchingDrivers) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingDrivers, isFetchingDrivers, hasError]);

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
            className="h-9"
            aria-label="Buscar motorista"
          />

          {!isLoadingDrivers &&
            !hasError &&
            isSearchSettled &&
            visibleDrivers.length === 0 && (
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

              {visibleDrivers.map((driver) => (
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

              {isFetchingDrivers &&
                drivers &&
                drivers.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}
            </CommandGroup>

            {showSpinner && !visibleDrivers.length && (
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

export { SearchDriver, matchesTyped };
