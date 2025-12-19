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

import { Skeleton } from "@/components/ui/skeleton";

import { useDriverInfiniteScroll } from "./hooks/driver-infinite-scroll";
import { Button } from "@/components/ui/button";

import { SearchDriverProps } from "./dto";

const SearchDriver = ({
  errorDriverId,
  selectedDriverId,
  businessId,
  handleUpdateSearchDriverInputValue,
  isOptional,
}: SearchDriverProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    drivers,
    lastElementRef: lastDriverRef,
    isLoading: isLoadingDrivers,
    isFetching: isFetchingDrivers,
    refetch: refetchDrivers,
    hasError,
    errorMessage,
  } = useDriverInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <div
        className={`text-sm font-medium ${errorDriverId ? "text-red-500" : ""}`}
      >
        {errorDriverId ? errorDriverId[0] : "Selecione o motorista"}{" "}
        {isOptional && "(opcional)"}
      </div>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput
          placeholder="Buscar motorista..."
          className="h-9"
          aria-label="Buscar motorista"
        />

        {!isLoadingDrivers && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhum motorista disponível</div>
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

            {drivers?.map((driver) => (
              <CommandItem
                key={driver.id}
                ref={lastDriverRef}
                onSelect={() => {
                  handleUpdateSearchDriverInputValue({
                    driverId: driver.id,
                    searchDriverInputValue: driver.name,
                    driverCnh: driver.cnh.slice(-4), // Passing the last 4 digits of the driver's license
                  });
                }}
                className="cursor-pointer"
              >
                {driver.name}{" "}
                <span className="text-xs text-muted-foreground ml-2">
                  (CNH: {driver.cnh.slice(-4)})
                </span>
                {selectedDriverId === driver.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
            ))}

            {isFetchingDrivers &&
              drivers &&
              drivers.length > 0 &&
              !hasError && <Skeleton className="w-full h-7" />}
          </CommandGroup>

          {showSpinner && !drivers?.length && (
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
    </div>
  );
};

export { SearchDriver };
