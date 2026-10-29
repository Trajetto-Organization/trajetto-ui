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

import { useFuelTypeInfiniteScroll } from "./hooks/fuel-type-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchFuelTypeProps } from "./search-fuel-type.types";
import { cn } from "@/lib/utils";

const SearchFuelType = ({
  errorFuelTypeId,
  searchFuelTypeInputValue,
  businessId,
  handleUpdateSearchFuelTypeInputValue,
  isOptional,
}: SearchFuelTypeProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // What the person typed, sent to the API as `search`: a fuel type that is
  // not among the loaded pages can still be found (FLEET-SEARCH-1).
  const [search, setSearch] = useState<string>("");

  const {
    fuelTypes,
    lastElementRef: lastFuelTypeRef,
    isLoading: isLoadingFuelTypes,
    isFetching: isFetchingFuelTypes,
    refetch: refetchFuelTypes,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useFuelTypeInfiniteScroll(businessId, search);

  // While the server's answer for the new term is on its way, the rows on
  // screen are the previous term's: narrow them locally meanwhile.
  const visibleFuelTypes = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term || isSearchSettled) return fuelTypes ?? [];

    return (fuelTypes ?? []).filter((fuelType) =>
      String(fuelType.description ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [fuelTypes, search, isSearchSettled]);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingFuelTypes || isFetchingFuelTypes) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingFuelTypes, isFetchingFuelTypes, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione o combustível ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorFuelTypeId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o combustível"
          // The server already filtered by the term; cmdk re-filtering the
          // answer would hide rows matched on fields it cannot see.
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
            placeholder="Buscar combustível..."
            className="h-9"
            aria-label="Buscar combustível"
          />

          {!isLoadingFuelTypes &&
            !hasError &&
            isSearchSettled &&
            visibleFuelTypes.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  Nenhum combustível disponível
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
                  {errorMessage || "Erro ao carregar os combustíveis"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchFuelTypes()}
                  >
                    Revalidar Combustíveis
                  </Button>
                </div>
              )}

              {visibleFuelTypes.map((fuelType) => (
                <CommandItem
                  key={fuelType.id}
                  ref={lastFuelTypeRef}
                  // The row's id, never its text: cmdk merges items with equal values, so
                  // two rows with the same text lit up together and Enter chose the first.
                  value={fuelType.id}
                  onSelect={() => {
                    handleUpdateSearchFuelTypeInputValue({
                      fuelTypeId: fuelType.id,
                      searchFuelTypeInputValue: fuelType.description,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span className="truncate max-w-[200px]">
                    {fuelType.description}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchFuelTypeInputValue === fuelType.description
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}

              {isFetchingFuelTypes &&
                visibleFuelTypes.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}
            </CommandGroup>

            {showSpinner && !visibleFuelTypes.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando combustíveis...
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

export { SearchFuelType };
