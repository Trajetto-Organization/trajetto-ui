"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Building2,
  Loader,
  Check,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { BusinessSelectorProps } from "./business-selector.types";
import { useBusinessSelector } from "./hooks";
import { businessListState } from "./list-state";

const BusinessSelector = ({
  currentBusinessId,
}: BusinessSelectorProps): JSX.Element => {
  const {
    open,
    searchValue,
    setOpen,
    setSearchValue,
    errorMessage,
    filteredBusiness,
    handleBusinessChange,
    handleRetry,
    hasError,
    isFetching,
    isLoading,
    lastElementRef,
    selectedBusiness,
    business,
    isSearchPending,
  } = useBusinessSelector({ currentBusinessId });

  // A typed term still owed its answer is "not known yet", never "not
  // found" (FLEET-SEARCH-1).
  const listState = businessListState({
    isLoading,
    hasError,
    isSearchPending,
    isFetching,
    loadedCount: business?.length ?? 0,
    shownCount: filteredBusiness.length,
  });

  // Renders the error state
  if (hasError && !business?.length) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">
          {errorMessage || "Erro ao carregar empresas"}
        </span>
        <Button size="sm" variant="outline" onClick={handleRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full sm:w-[300px]" data-tutorial="business-selector">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            // A combobox takes no name from its content (ARIA: author only):
            // without this a screen reader heard "combobox" and not which
            // company the screen is showing (axe button-name, critical).
            aria-label={
              selectedBusiness
                ? `Empresa: ${selectedBusiness.corporate_reason}`
                : "Selecione uma empresa"
            }
            className="w-full justify-between"
            disabled={isLoading}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />

              {selectedBusiness ? (
                <span className="truncate">
                  {selectedBusiness.corporate_reason}
                </span>
              ) : (
                <span className="truncate text-muted-foreground">
                  Selecione uma empresa
                </span>
              )}
            </span>
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>

        {/* Follows the field instead of a fixed 300px: on a phone the
        trigger is full width and a narrower panel looked detached. */}
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar empresa..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />

            <CommandList className="max-h-[200px]">
              {/* Initial loading state */}
              {isLoading && !business?.length && (
                <div className="p-2 space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </div>
              )}

              {/* Empty state: only once the server answered the term. */}
              {listState.empty && (
                <CommandEmpty>
                  {searchValue
                    ? "Nenhuma empresa encontrada."
                    : "Nenhuma empresa disponível."}
                </CommandEmpty>
              )}

              {/* The answer for the typed term is on its way. */}
              {listState.pending && (
                <div className="p-2" data-search-pending>
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {/* List of companies */}
              {filteredBusiness.length > 0 && (
                <CommandGroup>
                  {filteredBusiness.map((company, index) => {
                    const isLast = index === filteredBusiness.length - 1;

                    return (
                      <CommandItem
                        key={company.id}
                        value={company.id}
                        ref={isLast ? lastElementRef : undefined}
                        onSelect={() => handleBusinessChange(company.id)}
                        className="cursor-pointer"
                      >
                        <span className="truncate">
                          {company.corporate_reason}
                        </span>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            currentBusinessId === company.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Additional loading skeleton (infinite scroll) */}
              {isFetching && business && business.length > 0 && (
                <div className="p-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {/* Inline error during infinite scroll*/}
              {hasError && business && business.length > 0 && (
                <div className="p-2">
                  <div
                    className="flex items-center justify-between 
                    text-sm text-destructive"
                  >
                    <span>Erro ao carregar mais empresas</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRetry}
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
    </div>
  );
};

export { BusinessSelector };
