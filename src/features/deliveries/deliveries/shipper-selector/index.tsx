"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader } from "lucide-react";

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
import { useShipperInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-shipper/hooks/shipper-infinite-scroll";

import { cn } from "@/lib/utils";

interface ShipperSelectorProps {
  businessId: string;
  value: string;
  onChange: (shipperId: string) => void;
  errorName?: string[];
  disabled?: boolean;
  /**
   * The name to show for `value` when it is not among the loaded options —
   * a shipper past the first page, or one deactivated since (the picker lists
   * active ones only). Without it an edit opened on "Selecione o embarcador",
   * as if the delivery had none (DLV-SHP-2).
   */
  fallbackLabel?: string | null;
  /** Defaults to the required "Embarcador *"; the XML import's is optional. */
  label?: string;
}

/** A shipper matches the typed term locally until the server answers. */
const matchesTerm = (
  shipper: { name: string; cnpj?: string | null },
  term: string,
) =>
  [shipper.name, shipper.cnpj ?? ""].some((field) =>
    field.toLowerCase().includes(term),
  );

/**
 * Searchable picker in the kanban's shape: a shipper list has no natural
 * ceiling, so typing beats scrolling — and the list is paged by cursor
 * instead of capped at a fixed page size. The typed term is searched on the
 * server (name, CNPJ, e-mail), so a shipper not loaded yet is still found.
 */
const ShipperSelector = ({
  businessId,
  value,
  onChange,
  errorName,
  disabled,
  fallbackLabel,
  label = "Embarcador *",
}: ShipperSelectorProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const {
    shippers,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
    isSearchSettled,
  } = useShipperInfiniteScroll(businessId, searchValue);

  const selectedShipper = useMemo(
    () => shippers?.find((shipper: any) => shipper.id === value),
    [shippers, value],
  );

  // The server answers the typed term; until it does, the rows already
  // loaded are narrowed locally so the list does not flash stale matches.
  const filteredShippers = useMemo(() => {
    const term = searchValue.trim().toLowerCase();

    if (!term || isSearchSettled) return shippers ?? [];

    return (shippers ?? []).filter((shipper: any) =>
      matchesTerm(shipper, term),
    );
  }, [shippers, searchValue, isSearchSettled]);

  const selectedLabel =
    (selectedShipper as { name?: string } | undefined)?.name ??
    (value ? fallbackLabel : null) ??
    null;

  const handleSelect = (shipperId: string) => {
    onChange(shipperId);

    setOpen(false);
    setSearchValue("");
  };

  return (
    <FieldShell label={label} htmlFor="shipper-selector" error={errorName}>
      {(control) => (
        <>
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
                  control["aria-invalid"] &&
                    "border-red-600 dark:border-red-500",
                  !selectedLabel && "text-muted-foreground",
                )}
                disabled={disabled || isLoading}
              >
                {selectedLabel ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm" title={selectedLabel}>
                      {selectedLabel}
                    </span>
                  </div>
                ) : (
                  <span>Selecione o embarcador</span>
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
                  placeholder="Buscar embarcador..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="h-9"
                />

                <CommandList className="max-h-[220px]">
                  {isLoading && !shippers?.length && (
                    <div className="p-2 space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-9 w-full" />
                      ))}
                    </div>
                  )}

                  {!isLoading && !hasError && filteredShippers.length === 0 && (
                    <CommandEmpty>
                      {searchValue
                        ? "Nenhum embarcador encontrado."
                        : "Nenhum embarcador ativo cadastrado."}
                    </CommandEmpty>
                  )}

                  {filteredShippers.length > 0 && (
                    <CommandGroup>
                      {filteredShippers.map((shipper: any, index: number) => {
                        const isLast = index === filteredShippers.length - 1;

                        return (
                          <CommandItem
                            key={shipper.id}
                            value={shipper.id}
                            ref={isLast ? lastElementRef : undefined}
                            onSelect={() => handleSelect(shipper.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              {/* Stretched, not items-start: a flex-column child
                              is as wide as its text, so truncate never cut
                              a long name (DLV-OT-2). */}
                              <div className="flex min-w-0 flex-1 flex-col items-stretch">
                                <span
                                  className="min-w-0 truncate text-sm font-medium"
                                  title={shipper.name}
                                >
                                  {shipper.name}
                                </span>
                                {shipper.cnpj && (
                                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                                    {shipper.cnpj}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                value === shipper.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {isFetching && shippers && shippers.length > 0 && (
                    <div className="p-2">
                      <Skeleton className="h-9 w-full" />
                    </div>
                  )}

                  {hasError && (
                    <div className="p-2">
                      <div className="flex items-center justify-between gap-2 text-sm text-destructive">
                        <span className="truncate">
                          {errorMessage || "Erro ao carregar embarcadores"}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => refetch()}
                          className="h-6 px-2 text-xs"
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

          {/* Keeps the value reachable by the form, like the kanban selector. */}
          <input type="hidden" name="shipperId" value={value} />
        </>
      )}
    </FieldShell>
  );
};

export { ShipperSelector };
