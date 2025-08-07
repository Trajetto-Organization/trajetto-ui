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

import { useVehicleInfiniteScroll } from "./hooks/vehicle-infinite-scroll";
import { Button } from "@/components/ui/button";

import { CommandVehicleInputValue } from "../dto";

interface SearchVehicleProps {
  errorVehicleId?: string[];
  selectedVehicleId?: string;
  businessId: string;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
}

const SearchVehicle = ({
  errorVehicleId,
  selectedVehicleId,
  businessId,
  handleUpdateSearchVehicleInputValue,
}: SearchVehicleProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    vehicles,
    lastElementRef: lastVehicleRef,
    isLoading: isLoadingVehicle,
    isFetching: isFetchingVehicles,
    refetch: refetchVehicles,
    hasError,
    errorMessage,
  } = useVehicleInfiniteScroll(businessId);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingVehicle || isFetchingVehicles) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingVehicle, isFetchingVehicles, hasError]);

  return (
    <div className="space-y-2">
      <Label className={errorVehicleId ? "text-red-500" : ""}>
        {errorVehicleId ? errorVehicleId[0] : "Selecione o veículo"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput placeholder="Buscar veículo..." className="h-9" />

        {!isLoadingVehicle && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhum veículo disponível</div>
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

            {vehicles?.map((vehicle) => (
              <CommandItem
                key={vehicle.id}
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

            {isFetchingVehicles &&
              vehicles &&
              vehicles.length > 0 &&
              !hasError && <Skeleton className="w-full h-7" />}
          </CommandGroup>

          {showSpinner && !vehicles?.length && (
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
    </div>
  );
};

export { SearchVehicle };
