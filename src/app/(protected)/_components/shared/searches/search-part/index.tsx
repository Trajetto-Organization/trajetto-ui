import { useEffect, useMemo, useState, useId } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Check, Loader } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { usePartInfiniteScroll } from "./hooks/part-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchPartProps } from "./search-part.types";
import { cn } from "@/lib/utils";

const SearchPart = ({
  errorPartId,
  searchPartInputValue,
  businessId,
  handleUpdateSearchPartInputValue,
  isOptional,
}: SearchPartProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // What the person typed, sent to the API as `search`: a part that is not
  // among the loaded pages can still be found (FLEET-SEARCH-1).
  const [search, setSearch] = useState<string>("");

  const {
    parts,
    lastElementRef: lastPartRef,
    isLoading: isLoadingParts,
    isFetching: isFetchingParts,
    refetch: refetchParts,
    hasError,
    errorMessage,
    isSearchSettled,
  } = usePartInfiniteScroll(businessId, search);

  // While the server's answer for the new term is on its way, the rows on
  // screen are the previous term's: narrow them locally meanwhile.
  const visibleParts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term || isSearchSettled) return parts ?? [];

    return (parts ?? []).filter((part) =>
      String(part.description ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [parts, search, isSearchSettled]);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingParts || isFetchingParts) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingParts, isFetchingParts, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione a peça ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorPartId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione a peça"
          // The server already filtered by the term (description or supplier);
          // cmdk re-filtering the answer would hide the supplier matches.
          shouldFilter={false}
          className={cn(
            "h-[320px] relative border rounded-md",
            control["aria-invalid"] && "border-red-600 dark:border-red-500",
          )}
        >
          <CommandInput
            {...control}
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar peça ou fornecedor..."
            className="h-9"
            aria-label="Buscar peça"
          />

          {!isLoadingParts &&
            !hasError &&
            isSearchSettled &&
            visibleParts.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">Nenhuma peça disponível</div>
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
                  {errorMessage || "Erro ao carregar as peças"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchParts()}
                  >
                    Revalidar Peças
                  </Button>
                </div>
              )}

              {visibleParts.map((part) => (
                <CommandItem
                  key={part.id}
                  ref={lastPartRef}
                  // The row's id, never its text: cmdk merges items with equal values, so
                  // two rows with the same text lit up together and Enter chose the first.
                  value={part.id}
                  onSelect={() => {
                    handleUpdateSearchPartInputValue({
                      partId: part.id,
                      searchPartInputValue: part.description,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span className="truncate max-w-[200px]">
                    {part.description}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchPartInputValue === part.description
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}

              {isFetchingParts && visibleParts.length > 0 && !hasError && (
                <Skeleton className="w-full h-7" />
              )}
            </CommandGroup>

            {showSpinner && !visibleParts.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando peças...
                  </span>
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      )}
    </FieldShell>
  );
};

export { SearchPart };
