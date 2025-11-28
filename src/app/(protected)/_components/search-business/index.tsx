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

import { cn } from "@/lib/utils";

import { useBusinessInfiniteScroll } from "./hooks/business-infinite-scroll";
import { Button } from "@/components/ui/button";

import { SearchBusinessProps } from "./dto";

const SearchBusiness = ({
  errorBusinessId,
  searchBusinessInputValue,
  handleUpdateSearchBussinessInputValue,
}: SearchBusinessProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    business,
    lastElementRef,
    isLoading: isLoadingBusiness,
    isFetching: isFetchingBusiness,
    refetch: refetchBusiness,
    hasError,
    errorMessage,
  } = useBusinessInfiniteScroll();

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
    <div className="space-y-2">
      <Label
        htmlFor="search-business-input"
        className={errorBusinessId ? "text-red-500" : ""}
      >
        {errorBusinessId ? errorBusinessId[0] : "Selecione a Empresa"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput
          id="search-business-input"
          placeholder="Buscar empresa..."
          autoFocus
          className="h-9"
        />

        {!isLoadingBusiness && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhuma empresa disponível</div>
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

            {business?.map((business) => (
              <CommandItem
                key={business.id}
                ref={lastElementRef}
                value={business.corporate_reason}
                onSelect={() => {
                  handleUpdateSearchBussinessInputValue({
                    businessId: business.id,
                    searchBusinessInputValue: business.corporate_reason,
                  });
                }}
                className="cursor-pointer"
              >
                <span className="truncate max-w-[200px]">
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
    </div>
  );
};

export { SearchBusiness };
