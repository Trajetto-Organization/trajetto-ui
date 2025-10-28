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

import { useFuelTypeInfiniteScroll } from "./hooks/fuel-type-infinite-scroll";
import { Button } from "@/components/ui/button";

import { CommandFuelTypeInputValue } from "../dto";
import { cn } from "@/lib/utils";

interface SearchFuelTypeProps {
  errorFuelTypeId?: string[];
  searchFuelTypeInputValue: string;
  businessId: string;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
}

const SearchFuelType = ({
  errorFuelTypeId,
  searchFuelTypeInputValue,
  businessId,
  handleUpdateSearchFuelTypeInputValue,
}: SearchFuelTypeProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    fuelTypes,
    lastElementRef: lastFuelTypeRef,
    isLoading: isLoadingFuelTypes,
    isFetching: isFetchingFuelTypes,
    refetch: refetchFuelTypes,
    hasError,
    errorMessage,
  } = useFuelTypeInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <Label htmlFor="search-fuel-type-input" className={errorFuelTypeId ? "text-red-500" : ""}>
        {errorFuelTypeId ? errorFuelTypeId[0] : "Selecione o combustível"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput id="search-fuel-type-input" placeholder="Buscar combustível..." className="h-9" />

        {!isLoadingFuelTypes && !hasError && (
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

            {fuelTypes?.map((fuelType) => (
              <CommandItem
                key={fuelType.id}
                ref={lastFuelTypeRef}
                value={fuelType.description}
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
              fuelTypes &&
              fuelTypes.length > 0 &&
              !hasError && <Skeleton className="w-full h-7" />}
          </CommandGroup>

          {showSpinner && !fuelTypes?.length && (
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
    </div>
  );
};

export { SearchFuelType };
