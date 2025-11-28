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

import { useSupplierInfiniteScroll } from "./hooks/supplier-infinite-scroll";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { SearchSupplierProps } from "./dto";

const SearchSupplier = ({
  errorSupplierId,
  searchSupplierInputValue,
  businessId,
  handleUpdateSearchSupplierInputValue,
  isOptional,
}: SearchSupplierProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    suppliers,
    lastElementRef: lastSupplierRef,
    isLoading: isLoadingSuppliers,
    isFetching: isFetchingSuppliers,
    refetch: refetchSuppliers,
    hasError,
    errorMessage,
  } = useSupplierInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <Label
        htmlFor="search-supplier-input"
        className={errorSupplierId ? "text-red-500" : ""}
      >
        {errorSupplierId ? errorSupplierId[0] : "Selecione o fornecedor"}{" "}
        {isOptional && "(opcional)"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput
          id="search-supplier-input"
          placeholder="Buscar fornecedor..."
          className="h-9"
        />

        {!isLoadingSuppliers && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhum fornecedor disponível</div>
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

            {suppliers?.map((supplier) => (
              <CommandItem
                key={supplier.id}
                ref={lastSupplierRef}
                value={supplier.name}
                onSelect={() => {
                  handleUpdateSearchSupplierInputValue({
                    supplierId: supplier.id,
                    searchSupplierInputValue: supplier.name,
                  });
                }}
                className="cursor-pointer"
              >
                <span className="truncate max-w-[200px]">{supplier.name}</span>
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
    </div>
  );
};

export { SearchSupplier };
