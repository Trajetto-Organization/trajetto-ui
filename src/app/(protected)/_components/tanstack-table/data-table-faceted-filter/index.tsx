"use client";

import { Column } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Separator } from "@/components/ui/separator";

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options?: {
    label: string;
    value: string | boolean;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  dynamicOptionIcon?: React.ComponentType<{ className?: string }>;
  Icon?: React.ComponentType<{ className?: string }>;
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  Icon,
  dynamicOptionIcon,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(
    column?.getFilterValue() as (string | boolean)[],
  );

  const dynamicOptions = useMemo(() => {
    return Array.from(facets?.keys() || [])
      .filter((value) => value !== undefined && value !== null)
      .map((value) => ({
        label: String(value),
        value: String(value),
        icon: dynamicOptionIcon,
      }));
  }, [facets, dynamicOptionIcon]);

  const finalOptions = options || dynamicOptions;
  if (finalOptions.length === 0) return null;

  return (
    <Popover>
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
        <Command>
          <CommandInput
            id={title ? `filter-${title.replace(/\s+/g, '-').toLowerCase()}` : 'filter-input'}
            name={title ? `filter-${title.replace(/\s+/g, '-').toLowerCase()}` : 'filter-input'}
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
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }

                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined,
                      );
                    }}
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

                    {facets?.get(option.value) && (
                      <span
                        className="ml-auto flex h-4 w-4 text-xs
                        items-center justify-center font-mono font-bold"
                      >
                        {facets.get(option.value)}
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
