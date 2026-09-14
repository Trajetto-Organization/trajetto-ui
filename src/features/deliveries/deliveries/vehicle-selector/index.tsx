"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader, Truck } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Skeleton } from "@/components/ui/skeleton";
import { useVehicleInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-vehicle/hooks/vehicle-infinite-scroll";

import { cn } from "@/lib/utils";

interface VehicleSelectorProps {
  businessId: string;
  value: string;
  onChange: (vehicleId: string) => void;
  errorName?: string[];
  disabled?: boolean;
  /** Shown when value is set but not among the loaded pages yet. */
  fallbackLabel?: string;
}

/**
 * Same shape as the shipper selector, but optional: selecting the chosen
 * vehicle again clears it. The endpoint serves ACTIVE and IN_ROUTE vehicles
 * — the same set the assign rule accepts, so picker and API agree by
 * construction (tomorrow's load is dispatched while today's route runs).
 */
const VehicleSelector = ({
  businessId,
  value,
  onChange,
  errorName,
  disabled,
  fallbackLabel,
}: VehicleSelectorProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const {
    vehicles,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
  } = useVehicleInfiniteScroll(businessId);

  const selectedVehicle = useMemo(
    () => vehicles?.find((vehicle: any) => vehicle.id === value),
    [vehicles, value],
  );

  // Filtering happens here because the endpoint pages by cursor, not by
  // search term: what is already loaded is what the user can narrow.
  const filteredVehicles = useMemo(() => {
    if (!searchValue) return vehicles ?? [];

    const term = searchValue.toLowerCase();

    return (vehicles ?? []).filter((vehicle: any) =>
      [vehicle.description ?? "", vehicle.license_plate ?? ""].some(
        (field: string) => field.toLowerCase().includes(term),
      ),
    );
  }, [vehicles, searchValue]);

  const handleSelect = (vehicleId: string) => {
    // Optional field: picking the current vehicle again clears it.
    onChange(vehicleId === value ? "" : vehicleId);

    setOpen(false);
    setSearchValue("");
  };

  return (
    <div className="grid gap-3 relative">
      {errorName ? (
        <Label className="h-4 truncate text-red-500" htmlFor="vehicle-selector">
          {errorName[0]}
        </Label>
      ) : (
        <Label className="h-4 truncate" htmlFor="vehicle-selector">
          Veículo (opcional)
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="vehicle-selector"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              errorName && "border-red-500",
              !selectedVehicle && "text-muted-foreground",
            )}
            disabled={disabled || isLoading}
          >
            {selectedVehicle || (value && fallbackLabel) ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate text-sm">
                  {selectedVehicle
                    ? `${(selectedVehicle as any).license_plate}${
                        (selectedVehicle as any).description
                          ? ` — ${(selectedVehicle as any).description}`
                          : ""
                      }`
                    : fallbackLabel}
                </span>
              </div>
            ) : (
              <span>Sem veículo</span>
            )}

            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por placa ou descrição..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />

            <CommandList className="max-h-[220px]">
              {isLoading && !vehicles?.length && (
                <div className="p-2 space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 w-full" />
                  ))}
                </div>
              )}

              {!isLoading && !hasError && filteredVehicles.length === 0 && (
                <CommandEmpty>
                  {searchValue
                    ? "Nenhum veículo encontrado."
                    : "Nenhum veículo disponível cadastrado."}
                </CommandEmpty>
              )}

              {filteredVehicles.length > 0 && (
                <CommandGroup>
                  {filteredVehicles.map((vehicle: any, index: number) => {
                    const isLast = index === filteredVehicles.length - 1;

                    return (
                      <CommandItem
                        key={vehicle.id}
                        value={vehicle.id}
                        ref={isLast ? lastElementRef : undefined}
                        onSelect={() => handleSelect(vehicle.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="truncate text-sm font-medium">
                              {vehicle.license_plate}
                            </span>
                            {vehicle.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {vehicle.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            value === vehicle.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {isFetching && vehicles && vehicles.length > 0 && (
                <div className="p-2">
                  <Skeleton className="h-9 w-full" />
                </div>
              )}

              {hasError && (
                <div className="p-2">
                  <div
                    className="flex items-center justify-between gap-2
                    text-sm text-destructive"
                  >
                    <span className="truncate">
                      {errorMessage ?? "Erro ao carregar veículos."}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refetch}
                    >
                      Tentar de novo
                    </Button>
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { VehicleSelector };
