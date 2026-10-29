"use client";

import { Column } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSharedListQuery } from "@/lib/search-params";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { commandKeywordFilter } from "@/lib/command-keyword-filter";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Separator } from "@/components/ui/separator";

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  /**
   * The choices. A server-side table (DataTable `server`) must pass them,
   * with the API's counts: it has no page facets to fall back on, on
   * purpose — options and counts read off ten loaded rows are what this
   * replaced (decision 8.8).
   */
  options?: {
    label: string;
    value: string | boolean;
    icon?: React.ComponentType<{ className?: string }>;
    /** How many rows the option brings, from the server. */
    count?: number;
  }[];
  dynamicOptionIcon?: React.ComponentType<{ className?: string }>;
  Icon?: React.ComponentType<{ className?: string }>;
}

type FilterValue = string | boolean;

/**
 * The column's values with `value` ticked or unticked; none left clears the
 * filter. Applied to the latest value, not to the one this render read, so
 * two quick ticks both count.
 */
function toggleFilterValue(
  current: unknown,
  value: FilterValue,
): FilterValue[] | undefined {
  const selected = new Set<FilterValue>(
    Array.isArray(current) ? (current as FilterValue[]) : [],
  );

  if (selected.has(value)) {
    selected.delete(value);
  } else {
    selected.add(value);
  }

  return selected.size > 0 ? Array.from(selected) : undefined;
}

function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  Icon,
  dynamicOptionIcon,
}: DataTableFacetedFilterProps<TData, TValue>) {
  // Closing the popover means "done": what was ticked goes out now instead
  // of after the pause a server table waits for more ticks.
  const listQuery = useSharedListQuery();

  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(
    column?.getFilterValue() as (string | boolean)[],
  );

  const dynamicOptions = useMemo(() => {
    return Array.from(facets?.keys() || [])
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => ({
        label: String(value),
        value: String(value),
        icon: dynamicOptionIcon,
      }));
  }, [facets, dynamicOptionIcon]);

  const finalOptions = options || dynamicOptions;

  // The server's count when it sent one (0 included: it explains an empty
  // table); a legacy client table shows what its page holds, or nothing.
  const countOf = (option: { value: string | boolean; count?: number }) =>
    option.count ?? (facets?.get(option.value) || undefined);

  if (finalOptions.length === 0) return null;

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) listQuery?.flush();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed flex 
          justify-center items-center gap-1"
        >
          {Icon ? (
            <Icon className="h-[17px] w-[17px]" />
          ) : (
            <PlusCircle width={17} />
          )}

          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selecionados
                  </Badge>
                ) : (
                  finalOptions
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={String(option.value)}
                        className="rounded-sm px-1 font-normal 
                        block truncate max-w-52"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command filter={commandKeywordFilter}>
          <CommandInput
            id={
              title
                ? `filter-${title.replace(/\s+/g, "-").toLowerCase()}`
                : "filter-input"
            }
            name={
              title
                ? `filter-${title.replace(/\s+/g, "-").toLowerCase()}`
                : "filter-input"
            }
            placeholder={title}
          />
          <CommandList
            className="max-h-[200px] [&::-webkit-scrollbar]:w-2 
            [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm 
            [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground [&]:scrollbar-thin 
            [&]:scrollbar-track-transparent [&]:scrollbar-thumb-border"
          >
            <CommandEmpty>Nenhum resultado</CommandEmpty>
            <CommandGroup>
              {finalOptions.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={String(option.value)}
                    // The option's value, never its label: two options with
                    // the same label shared one highlight and Enter toggled
                    // the first. The label stays searchable as a keyword.
                    value={String(option.value)}
                    keywords={[option.label]}
                    onSelect={() =>
                      column?.setFilterValue((current: unknown) =>
                        toggleFilterValue(current, option.value),
                      )
                    }
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        `mr-2 flex h-4 w-4 items-center justify-center 
                        rounded-sm border border-primary`,
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check />
                    </div>

                    {option.icon && (
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                    )}

                    <span className="truncate">{option.label}</span>

                    {countOf(option) !== undefined && (
                      <span
                        className="ml-auto flex h-4 min-w-4 pl-1 text-xs
                        items-center justify-end font-mono font-bold tabular-nums"
                      >
                        {countOf(option)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear-filters__"
                    keywords={["Limpar Filtros"]}
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center cursor-pointer"
                  >
                    Limpar Filtros
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { DataTableFacetedFilter, toggleFilterValue };
