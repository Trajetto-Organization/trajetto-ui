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

import { useSupplierInfiniteScroll } from "./hooks/supplier-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchSupplierProps } from "./search-supplier.types";
import { cn } from "@/lib/utils";

const SearchSupplier = ({
  errorSupplierId,
  searchSupplierInputValue,
  businessId,
  handleUpdateSearchSupplierInputValue,
  isOptional,
}: SearchSupplierProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // The typed term goes to the API (FLEET-SEARCH-1): it searches name,
  // e-mail, city and the CNPJ digits over the whole company, not only the
  // pages already loaded.
  const [search, setSearch] = useState<string>("");

  const {
    suppliers,
    lastElementRef: lastSupplierRef,
    isLoading: isLoadingSuppliers,
    isFetching: isFetchingSuppliers,
    refetch: refetchSuppliers,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useSupplierInfiniteScroll(businessId, search);

  // While the server's answer for the new term is on the way, the rows on
  // screen are narrowed here so the list does not lag behind the typing.
  const visibleSuppliers = useMemo(() => {
    if (!search || isSearchSettled) return suppliers ?? [];

    const term = search.toLowerCase();

    return (suppliers ?? []).filter((supplier) =>
      supplier.name.toLowerCase().includes(term),
    );
  }, [suppliers, search, isSearchSettled]);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingSuppliers || isFetchingSuppliers) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingSuppliers, isFetchingSuppliers, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione o fornecedor ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorSupplierId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o fornecedor"
          // The server already filtered by the term, by fields (CNPJ, e-mail)
          // that are not in the item text cmdk would match against.
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
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            className="h-9"
            aria-label="Buscar fornecedor"
          />

          {!isLoadingSuppliers &&
            !hasError &&
            visibleSuppliers.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  Nenhum fornecedor disponível
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
                  {errorMessage || "Erro ao carregar os fornecedores"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchSuppliers()}
                  >
                    Revalidar Fornecedores
                  </Button>
                </div>
              )}

              {visibleSuppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  ref={lastSupplierRef}
                  value={supplier.id}
                  onSelect={() => {
                    handleUpdateSearchSupplierInputValue({
                      supplierId: supplier.id,
                      searchSupplierInputValue: supplier.name,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span className="truncate max-w-[200px]">
                    {supplier.name}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchSupplierInputValue === supplier.name
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}

              {isFetchingSuppliers &&
                suppliers &&
                suppliers.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}
            </CommandGroup>

            {showSpinner && !suppliers?.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando fornecedores...
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

export { SearchSupplier };
