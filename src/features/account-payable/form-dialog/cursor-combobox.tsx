"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Check, ChevronsUpDown, Loader } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { cn } from "@/lib/utils";

/** What a `use*InfiniteScroll` picker hook returns (useCursorSearch). */
interface CursorList<T> {
  items: T[];
  lastElementRef: (node: HTMLDivElement | null) => void;
  isLoading: boolean;
  isFetching: boolean;
  hasError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  isSearchSettled: boolean;
}

interface CursorComboboxProps<T extends { id: string }> {
  /** "Filial *" or "Veículo (opcional)" (decision 3.3). */
  label: string;
  htmlFor: string;
  value: string;
  onChange: (id: string, item: T | null) => void;
  /** The typed term: sent to the API by the caller's hook. */
  search: string;
  onSearchChange: (search: string) => void;
  list: CursorList<T>;
  itemLabel: (item: T) => string;
  itemDescription?: (item: T) => string | null | undefined;
  /** Shown while the chosen item is not among the loaded rows. */
  fallbackLabel?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  icon: ComponentType<{ className?: string }>;
  errorName?: string[];
  hint?: ReactNode;
  disabled?: boolean;
  /** Optional fields: choosing the current item again clears it. */
  clearable?: boolean;
}

/**
 * One compact searchable picker for the bill's links (branch, responsible,
 * supplier, vehicle, service order), the shape of the route dialog's
 * vehicle selector. The old form spread these over three steps of 320px
 * lists; a popover keeps the bill in one step (decision 3.2).
 *
 * The term goes to the server (FLEET-SEARCH-1): `shouldFilter={false}`, and
 * the loaded rows are narrowed locally only while the answer is on the way.
 */
function CursorCombobox<T extends { id: string }>({
  label,
  htmlFor,
  value,
  onChange,
  search,
  onSearchChange,
  list,
  itemLabel,
  itemDescription,
  fallbackLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  icon: Icon,
  errorName,
  hint,
  disabled,
  clearable = false,
}: CursorComboboxProps<T>): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);

  // The label of the row picked from a search: once the term is cleared the
  // list goes back to its first page, which may not hold that row.
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(
    null,
  );

  const selected = useMemo(
    () => list.items.find((item) => item.id === value) ?? null,
    [list.items, value],
  );

  const selectedLabel = selected
    ? itemLabel(selected)
    : ((picked?.id === value ? picked.label : undefined) ??
      (value ? fallbackLabel : undefined));

  const visible = useMemo(() => {
    if (!search || list.isSearchSettled) return list.items;

    const term = search.toLowerCase();

    return list.items.filter((item) =>
      [itemLabel(item), itemDescription?.(item) ?? ""].some((text) =>
        text.toLowerCase().includes(term),
      ),
    );
  }, [list.items, list.isSearchSettled, search, itemLabel, itemDescription]);

  const choose = (item: T) => {
    const clears = clearable && item.id === value;

    setPicked(clears ? null : { id: item.id, label: itemLabel(item) });
    onChange(clears ? "" : item.id, clears ? null : item);

    setOpen(false);
    onSearchChange("");
  };

  return (
    <FieldShell label={label} htmlFor={htmlFor} error={errorName} hint={hint}>
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
              disabled={disabled}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {selectedLabel ?? placeholder}
                </span>
              </span>

              {list.isLoading ? (
                <Loader className="h-4 w-4 shrink-0 animate-spin opacity-50" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={onSearchChange}
                className="h-9"
              />

              <CommandList className="max-h-[220px]">
                {list.isLoading && list.items.length === 0 && (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-9 w-full" />
                    ))}
                  </div>
                )}

                {list.hasError && (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm">
                    <span>
                      {list.errorMessage ??
                        "Não foi possível carregar a lista."}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8"
                      onClick={() => list.refetch()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}

                {!list.isLoading && !list.hasError && visible.length === 0 && (
                  <CommandEmpty>{emptyText}</CommandEmpty>
                )}

                {visible.length > 0 && (
                  <CommandGroup>
                    {visible.map((item, index) => {
                      const description = itemDescription?.(item);

                      return (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          ref={
                            index === visible.length - 1
                              ? list.lastElementRef
                              : undefined
                          }
                          onSelect={() => choose(item)}
                          className="cursor-pointer"
                        >
                          <span className="flex min-w-0 flex-1 flex-col items-start">
                            <span className="max-w-full truncate text-sm font-medium">
                              {itemLabel(item)}
                            </span>
                            {description && (
                              <span className="max-w-full truncate text-xs text-muted-foreground">
                                {description}
                              </span>
                            )}
                          </span>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              value === item.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {list.isFetching && list.items.length > 0 && !list.hasError && (
                  <div className="p-2">
                    <Skeleton className="h-7 w-full" />
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </FieldShell>
  );
}

export { CursorCombobox, type CursorList };
