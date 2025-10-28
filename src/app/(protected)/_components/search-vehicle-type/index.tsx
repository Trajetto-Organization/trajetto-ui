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

import { useVehicleTypeInfiniteScroll } from "./hooks/vehicle-type-infinite-scroll";
import { Button } from "@/components/ui/button";

import { CommandVehicleTypeInputValue } from "../dto";
import { cn } from "@/lib/utils";

interface SearchVehicleTypeProps {
  errorVehicleTypeId?: string[];
  searchVehicleTypeInputValue: string;
  businessId: string;
  handleUpdateSearchVehicleTypeInputValue: (
    vehicleTypeData: CommandVehicleTypeInputValue,
  ) => void;
  isOptional?: boolean;
}

const SearchVehicleType = ({
  errorVehicleTypeId,
  searchVehicleTypeInputValue,
  businessId,
  handleUpdateSearchVehicleTypeInputValue,
  isOptional,
}: SearchVehicleTypeProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    vehicleTypes,
    lastElementRef: lastVehicleTypeRef,
    isLoading: isLoadingVehicleTypes,
    isFetching: isFetchingVehicleTypes,
    refetch: refetchVehicleTypes,
    hasError,
    errorMessage,
  } = useVehicleTypeInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <Label htmlFor="search-vehicle-type-input" className={errorVehicleTypeId ? "text-red-500" : ""}>
        {errorVehicleTypeId
          ? errorVehicleTypeId[0]
          : "Selecione o tipo de veículo"}{" "}
        {isOptional && "(opcional)"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput id="search-vehicle-type-input" placeholder="Buscar tipo de veículo..." className="h-9" />

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

            {vehicleTypes?.map((vehicleType) => (
              <CommandItem
                key={vehicleType.id}
                ref={lastVehicleTypeRef}
                value={vehicleType.description}
                onSelect={() => {
                  handleUpdateSearchVehicleTypeInputValue({
                    vehicleTypeId: vehicleType.id,
                    searchVehicleTypeInputValue: vehicleType.description,
                  });
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
    </div>
  );
};

export { SearchVehicleType };
