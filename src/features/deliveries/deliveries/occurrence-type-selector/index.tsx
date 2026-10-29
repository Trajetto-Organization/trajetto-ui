"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader, TriangleAlert } from "lucide-react";

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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface OccurrenceTypeOption {
  id: string;
  name: string;
  description?: string | null;
  blocks_delivery?: boolean;
  requires_photo?: boolean;
  /** The platform's own type ("Comprovante rejeitado"): never offered. */
  is_system?: boolean;
}

interface OccurrenceTypeSelectorProps {
  occurrenceTypes: OccurrenceTypeOption[];
  value: string;
  onChange: (occurrenceTypeId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Same searchable picker the delivery form uses for the shipper.
 *
 * A plain select was fine while a company had four occurrence types; a real
 * catalogue is a scrolling list where the person in the field already knows
 * the word they are looking for. It also gives the empty case a sentence
 * instead of an empty dropdown — "nenhum tipo cadastrado" is actionable,
 * a blank panel is not.
 *
 * The list is already in memory (the dialog loads it), so filtering happens
 * here rather than over the network.
 */
const OccurrenceTypeSelector = ({
  occurrenceTypes,
  value,
  onChange,
  isLoading,
  disabled,
}: OccurrenceTypeSelectorProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const selected = useMemo(
    () => occurrenceTypes.find((type) => type.id === value),
    [occurrenceTypes, value],
  );

  // The proof audit writes "Comprovante rejeitado" itself (DLVP-OCC-3): it
  // is history, not something a person files.
  const offered = useMemo(
    () => occurrenceTypes.filter((type) => !type.is_system),
    [occurrenceTypes],
  );

  const filtered = useMemo(() => {
    if (!searchValue) return offered;

    const term = searchValue.toLowerCase();

    return offered.filter((type) =>
      [type.name, type.description ?? ""].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [offered, searchValue]);

  const handleSelect = (occurrenceTypeId: string) => {
    onChange(occurrenceTypeId);

    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
          disabled={disabled || isLoading}
        >
          {selected ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TriangleAlert className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{selected.name}</span>

              {selected.blocks_delivery && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-red-200 bg-red-50
                  text-[10px] text-red-700"
                >
                  Impeditiva
                </Badge>
              )}
            </div>
          ) : (
            <span>Selecione o tipo de ocorrência</span>
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
            placeholder="Buscar tipo de ocorrência..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />

          <CommandList className="max-h-[220px]">
            {filtered.length === 0 && (
              <CommandEmpty>
                {searchValue
                  ? "Nenhum tipo de ocorrência encontrado."
                  : "Nenhum tipo de ocorrência ativo cadastrado."}
              </CommandEmpty>
            )}

            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((type) => (
                  <CommandItem
                    key={type.id}
                    value={type.id}
                    onSelect={() => handleSelect(type.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <TriangleAlert className="h-4 w-4 shrink-0 text-muted-foreground" />

                      {/* Stretched, not items-start: a flex-column child is
                          as wide as its text, so a long description never
                          truncated and ran past the list (DLV-OT-2). */}
                      <div className="flex min-w-0 flex-1 flex-col items-stretch">
                        <span className="flex w-full items-center gap-2">
                          <span
                            className="min-w-0 truncate text-sm font-medium"
                            title={type.name}
                          >
                            {type.name}
                          </span>

                          {type.blocks_delivery && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-red-200 bg-red-50
                              text-[10px] text-red-700"
                            >
                              Impeditiva
                            </Badge>
                          )}

                          {type.requires_photo && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-blue-200 bg-blue-50
                              text-[10px] text-blue-700"
                            >
                              Exige foto
                            </Badge>
                          )}
                        </span>

                        {type.description && (
                          <span
                            className="line-clamp-2 w-full break-words text-xs text-muted-foreground [overflow-wrap:anywhere]"
                            title={type.description}
                          >
                            {type.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === type.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { OccurrenceTypeSelector };
