"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader, UserRound } from "lucide-react";

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
import { useDriverInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-driver/hooks/driver-infinite-scroll";

import { cn } from "@/lib/utils";

interface DriverSelectorProps {
  businessId: string;
  value: string;
  onChange: (driverId: string) => void;
  errorName?: string[];
  disabled?: boolean;
  /** Shown when value is set but not among the loaded pages yet. */
  fallbackLabel?: string;
}

/**
 * Same shape as the shipper selector: searchable, paged by cursor. The
 * endpoint only serves ACTIVE drivers, which is exactly what the assign
 * rule accepts — the picker and the API agree by construction.
 */
const DriverSelector = ({
  businessId,
  value,
  onChange,
  errorName,
  disabled,
  fallbackLabel,
}: DriverSelectorProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // The name of the row picked from a search: once the term is cleared the
  // list goes back to its first page, which may not hold that driver.
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(
    null,
  );

  const {
    drivers,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
    isSearchSettled,
  } = useDriverInfiniteScroll(businessId, searchValue);

  const selectedDriver = useMemo(
    () => drivers?.find((driver: any) => driver.id === value),
    [drivers, value],
  );

  const selectedName =
    (selectedDriver as any)?.name ??
    (picked?.id === value ? picked.name : undefined) ??
    (value ? fallbackLabel : undefined);

  // The API searches by the term (a driver beyond the loaded pages is found);
  // while its answer is on the way, the rows on screen are narrowed here.
  const filteredDrivers = useMemo(() => {
    if (!searchValue || isSearchSettled) return drivers ?? [];

    const term = searchValue.toLowerCase();

    return (drivers ?? []).filter((driver: any) =>
      [driver.name, driver.cnh ?? ""].some((field: string) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [drivers, searchValue, isSearchSettled]);

  const handleSelect = (driver: { id: string; name: string }) => {
    setPicked({ id: driver.id, name: driver.name });
    onChange(driver.id);

    setOpen(false);
    setSearchValue("");
  };

  return (
    <FieldShell label="Motorista *" htmlFor="driver-selector" error={errorName}>
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
                !selectedName && "text-muted-foreground",
              )}
              disabled={disabled || isLoading}
            >
              {selectedName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <UserRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-sm">{selectedName}</span>
                </div>
              ) : (
                <span>Selecione o motorista</span>
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
                placeholder="Buscar motorista..."
                value={searchValue}
                onValueChange={setSearchValue}
                className="h-9"
              />

              <CommandList className="max-h-[220px]">
                {isLoading && !drivers?.length && (
                  <div className="p-2 space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-9 w-full" />
                    ))}
                  </div>
                )}

                {!isLoading && !hasError && filteredDrivers.length === 0 && (
                  <CommandEmpty>
                    {searchValue
                      ? "Nenhum motorista encontrado."
                      : "Nenhum motorista ativo cadastrado."}
                  </CommandEmpty>
                )}

                {filteredDrivers.length > 0 && (
                  <CommandGroup>
                    {filteredDrivers.map((driver: any, index: number) => {
                      const isLast = index === filteredDrivers.length - 1;

                      return (
                        <CommandItem
                          key={driver.id}
                          value={driver.id}
                          ref={isLast ? lastElementRef : undefined}
                          onSelect={() => handleSelect(driver)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <UserRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              {/* w-full: under items-start a span shrinks to its
                                text and truncate never engages (DLV-OT-2). */}
                              <span
                                className="w-full max-w-full truncate text-sm font-medium"
                                title={driver.name}
                              >
                                {driver.name}
                              </span>
                              {driver.cnh && (
                                <span className="w-full max-w-full truncate text-xs text-muted-foreground">
                                  CNH: {driver.cnh}
                                </span>
                              )}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              value === driver.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {isFetching && drivers && drivers.length > 0 && (
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
                        {errorMessage ?? "Erro ao carregar motoristas."}
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

export { DriverSelector };
