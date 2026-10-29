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

import { useBranchInfiniteScroll } from "./hooks/branch-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchBranchProps } from "./search-branch.types";
import { cn } from "@/lib/utils";

const SearchBranch = ({
  errorBranchId,
  searchBranchInputValue,
  businessId,
  handleUpdateSearchBranchInputValue,
  isOptional,
}: SearchBranchProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // What the person typed, sent to the API as `search`: a branch that is not
  // among the loaded pages can still be found (FLEET-SEARCH-1), by CNPJ,
  // city or e-mail too.
  const [search, setSearch] = useState<string>("");

  const {
    branches,
    lastElementRef: lastBranchRef,
    isLoading: isLoadingBranches,
    isFetching: isFetchingBranches,
    refetch: refetchBranches,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useBranchInfiniteScroll(businessId, search);

  // While the server's answer for the new term is on its way, the rows on
  // screen are the previous term's: narrow them locally meanwhile.
  const visibleBranches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term || isSearchSettled) return branches ?? [];

    return (branches ?? []).filter((branch) =>
      String(branch.corporate_reason ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [branches, search, isSearchSettled]);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingBranches || isFetchingBranches) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingBranches, isFetchingBranches, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione a filial ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorBranchId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione a filial"
          // The server already filtered by the term; cmdk re-filtering the
          // answer would hide rows matched on fields it cannot see.
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
            placeholder="Buscar filial..."
            className="h-9"
            aria-label="Buscar filial"
          />

          {!isLoadingBranches &&
            !hasError &&
            isSearchSettled &&
            visibleBranches.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  Nenhuma filial disponível
                </div>
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
                  {errorMessage || "Erro ao carregar as filiais"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchBranches()}
                  >
                    Revalidar Filiais
                  </Button>
                </div>
              )}

              {visibleBranches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  ref={lastBranchRef}
                  value={branch.id}
                  onSelect={() => {
                    handleUpdateSearchBranchInputValue({
                      branchId: branch.id,
                      searchBranchInputValue: branch.corporate_reason,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <span
                    className="min-w-0 max-w-full flex-1 truncate"
                    title={branch.corporate_reason}
                  >
                    {branch.corporate_reason}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto",
                      searchBranchInputValue === branch.corporate_reason
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}

              {isFetchingBranches &&
                branches &&
                branches.length > 0 &&
                !hasError && <Skeleton className="w-full h-7" />}
            </CommandGroup>

            {showSpinner && !branches?.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando filiais...
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

export { SearchBranch };
