import { useEffect, useMemo, useState, useId } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FieldShell,
  parseFieldLabel,
} from "@/components/shared/custom/field-shell";

import { Check, Loader } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useBusinessInfiniteScroll } from "./hooks/business-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchBusinessProps } from "./search-business.types";

const SearchBusiness = ({
  label = "Selecione a empresa *",
  errorBusinessId,
  searchBusinessInputValue,
  handleUpdateSearchBussinessInputValue,
}: SearchBusinessProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // What the person typed, sent to the API as `search`: a company that is
  // not among the loaded pages can still be found, by CNPJ or e-mail too
  // (FLEET-SEARCH-1).
  const [search, setSearch] = useState<string>("");

  const {
    business,
    lastElementRef,
    isLoading: isLoadingBusiness,
    isFetching: isFetchingBusiness,
    refetch: refetchBusiness,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useBusinessInfiniteScroll(search);

  // While the server's answer for the new term is on its way, the rows on
  // screen are the previous term's: narrow them locally meanwhile.
  const visibleBusiness = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term || isSearchSettled) return business ?? [];

    return (business ?? []).filter((item) =>
      String(item.corporate_reason ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [business, search, isSearchSettled]);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingBusiness || isFetchingBusiness) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingBusiness, isFetchingBusiness, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={label}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorBusinessId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text: the
          // field's own label, without the required marker.
          label={parseFieldLabel(label).text}
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
            placeholder="Buscar empresa..."
            autoFocus
            className="h-9"
            aria-label="Buscar empresa"
          />

          {!isLoadingBusiness &&
            !hasError &&
            isSearchSettled &&
            visibleBusiness.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  Nenhuma empresa disponível
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
                  className="absolute inset-0 flex flex-col px-6 
                items-center justify-center text-center"
                >
                  {errorMessage || "Erro ao carregar as empresas"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchBusiness()}
                  >
                    Revalidar Empresas
                  </Button>
                </div>
              )}

              {visibleBusiness.map((business) => (
                <CommandItem
                  key={business.id}
                  ref={lastElementRef}
                  value={business.id}
                  onSelect={() => {
                    handleUpdateSearchBussinessInputValue({
                      businessId: business.id,
                      searchBusinessInputValue: business.corporate_reason,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span
                    className="min-w-0 max-w-full flex-1 truncate"
                    title={business.corporate_reason}
                  >
                    {business.corporate_reason}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchBusinessInputValue === business.corporate_reason
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}

              {isFetchingBusiness &&
                business &&
                business.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}

              {showSpinner && !business?.length && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Loader className="animate-spin h-6 w-6 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Carregando empresas...
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

export { SearchBusiness };
