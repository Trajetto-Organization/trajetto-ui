"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Skeleton } from "@/components/ui/skeleton";
import { useVehicleInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-vehicle/hooks/vehicle-infinite-scroll";

import { cn } from "@/lib/utils";

import { responsibleLabel, vehicleStatusLabel } from "@/lib/vehicle-status";

interface VehicleSelectorProps {
  businessId: string;
  value: string;
  onChange: (vehicleId: string) => void;
  errorName?: string[];
  disabled?: boolean;
  /** Shown when value is set but not among the loaded pages yet. */
  fallbackLabel?: string;

  /**
   * Defaults to "(opcional)", which is what it is on the route form while a
   * route is still PLANNED. The batch assignment releases the route in the
   * same call, and a released route requires a vehicle — so it passes its own
   * label rather than telling people something optional is being refused.
   */
  label?: string;

  /** Help under the field, read out with it (FieldShell's hint slot). */
  hint?: ReactNode;

  /**
   * The driver being assigned, so each row can say whose truck it is
   * relative to them (FLEET-ASSIGN-2): "their own" is what a dispatcher
   * scans for, and another driver's truck is a substitution worth seeing.
   */
  chosenDriverId?: string;
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
  label = "Veículo (opcional)",
  hint,
  chosenDriverId,
}: VehicleSelectorProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // The label of the row picked from a search: once the term is cleared the
  // list goes back to its first page, which may not hold that vehicle.
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(
    null,
  );

  const {
    vehicles,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
    isSearchSettled,
  } = useVehicleInfiniteScroll(businessId, searchValue);

  const selectedVehicle = useMemo(
    () => vehicles?.find((vehicle: any) => vehicle.id === value),
    [vehicles, value],
  );

  const labelOf = (vehicle: any): string =>
    `${vehicle.license_plate}${vehicle.description ? ` — ${vehicle.description}` : ""}`;

  const selectedLabel = selectedVehicle
    ? labelOf(selectedVehicle)
    : ((picked?.id === value ? picked.label : undefined) ??
      (value ? fallbackLabel : undefined));

  // The API searches by the term (plate, description, brand, model); while
  // its answer is on the way, the rows on screen are narrowed here.
  const filteredVehicles = useMemo(() => {
    if (!searchValue || isSearchSettled) return vehicles ?? [];

    const term = searchValue.toLowerCase();

    return (vehicles ?? []).filter((vehicle: any) =>
      [vehicle.description ?? "", vehicle.license_plate ?? ""].some(
        (field: string) => field.toLowerCase().includes(term),
      ),
    );
  }, [vehicles, searchValue, isSearchSettled]);

  const handleSelect = (vehicle: any) => {
    // Optional field: picking the current vehicle again clears it.
    const next = vehicle.id === value ? "" : vehicle.id;

    setPicked(next ? { id: next, label: labelOf(vehicle) } : null);
    onChange(next);

    setOpen(false);
    setSearchValue("");
  };

  return (
    <FieldShell
      label={label}
      htmlFor="vehicle-selector"
      error={errorName}
      hint={hint}
    >
      {(control) => (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              {...control}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between font-normal",
                control["aria-invalid"] && "border-red-600 dark:border-red-500",
                !selectedLabel && "text-muted-foreground",
              )}
              disabled={disabled || isLoading}
            >
              {selectedLabel ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-sm">{selectedLabel}</span>
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

                      const responsible = responsibleLabel({
                        vehicleDriverId: vehicle.driverId,
                        vehicleDriverName: vehicle.driver?.name,
                        chosenDriverId,
                      });

                      return (
                        <CommandItem
                          key={vehicle.id}
                          value={vehicle.id}
                          ref={isLast ? lastElementRef : undefined}
                          onSelect={() => handleSelect(vehicle)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="flex max-w-full items-center gap-2">
                                <span className="truncate text-sm font-medium">
                                  {vehicle.license_plate}
                                </span>
                                {/* On the street now: still choosable (tomorrow's
                                  route is planned while today's runs), marked. */}
                                {vehicle.status &&
                                  vehicle.status !== "ACTIVE" && (
                                    <span
                                      className="shrink-0 rounded border border-amber-300 px-1.5
                                  text-[10px] font-medium leading-4 text-amber-800
                                  dark:border-amber-800 dark:text-amber-200"
                                    >
                                      {vehicleStatusLabel(vehicle.status)}
                                    </span>
                                  )}
                              </span>
                              {/* A long description wraps to two lines, whole in
                                the title (DLV-OT-2). */}
                              {vehicle.description && (
                                <span
                                  className="line-clamp-2 w-full max-w-full break-words text-xs text-muted-foreground"
                                  title={vehicle.description}
                                >
                                  {vehicle.description}
                                </span>
                              )}
                              {responsible && (
                                <span className="w-full max-w-full truncate text-xs text-muted-foreground">
                                  {responsible}
                                </span>
                              )}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              value === vehicle.id
                                ? "opacity-100"
                                : "opacity-0",
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
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </FieldShell>
  );
};

export { VehicleSelector };
