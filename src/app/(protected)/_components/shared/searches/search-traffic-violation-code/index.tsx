import { useEffect, useState, useId } from "react";
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

import { useTrafficViolationCodeInfiniteScroll } from "./hooks/traffic-violation-code-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchTrafficViolationCodeProps } from "./search-traffic-violation-code.types";
import { cn } from "@/lib/utils";

/** How a code reads once picked: "745-50 - Transitar em velocidade…". */
function getDisplayText(violationCode: any): string {
  return `${violationCode.fullCode || `${violationCode.code}-${violationCode.sub_code}`} - ${violationCode.description}`;
}

/** What the local narrowing matches while the server answer is pending. */
function getSearchValue(violationCode: any): string {
  return `${violationCode.code} ${violationCode.sub_code} ${violationCode.description} ${violationCode.fullCode || ""}`;
}

const SearchTrafficViolationCode = ({
  errorTrafficViolationCodeId,
  searchTrafficViolationCodeInputValue,
  handleUpdateSearchTrafficViolationCodeInputValue,
  isOptional,
}: SearchTrafficViolationCodeProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // What is typed goes to the API (FLEET-SEARCH-1): the national table has
  // hundreds of codes, and filtering only the loaded page made a code not
  // yet scrolled into view look like it did not exist.
  const [search, setSearch] = useState<string>("");

  const {
    trafficViolationCode,
    lastElementRef: lastTrafficViolationCodeRef,
    isLoading: isLoadingTrafficViolationCodes,
    isFetching: isFetchingTrafficViolationCodes,
    refetch: refetchTrafficViolationCodes,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useTrafficViolationCodeInfiniteScroll(search);

  // While the server's answer for the new term is on its way, narrow the
  // rows already on screen so typing still feels immediate.
  const visibleCodes = isSearchSettled
    ? trafficViolationCode
    : trafficViolationCode.filter((violationCode) =>
        getSearchValue(violationCode)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      );

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingTrafficViolationCodes || isFetchingTrafficViolationCodes) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [
    isLoadingTrafficViolationCodes,
    isFetchingTrafficViolationCodes,
    hasError,
  ]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione o código de infração de trânsito ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorTrafficViolationCodeId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o código de infração de trânsito"
          // The server already filtered; cmdk re-filtering would hide rows
          // it matched on fields not in the item text.
          shouldFilter={false}
          className={cn(
            "relative border rounded-md",
            control["aria-invalid"] && "border-red-600 dark:border-red-500",
          )}
        >
          <CommandInput
            {...control}
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por código ou descrição..."
            className="h-9"
            aria-label="Buscar código de infração de trânsito"
          />

          {!isLoadingTrafficViolationCodes &&
            !hasError &&
            isSearchSettled &&
            visibleCodes.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  Nenhum código de infração encontrado
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
                  className="flex flex-col px-6 py-8 
                  items-center justify-center text-center"
                >
                  <p className="text-sm text-muted-foreground mb-3">
                    {errorMessage || "Erro ao carregar os códigos de infração"}
                  </p>
                  <Button
                    className="h-8"
                    variant="outline"
                    type="button"
                    onClick={() => refetchTrafficViolationCodes()}
                  >
                    Recarregar Códigos
                  </Button>
                </div>
              )}

              {!hasError &&
                visibleCodes.map((violationCode, index) => {
                  const displayText = getDisplayText(violationCode);
                  const isSelected =
                    searchTrafficViolationCodeInputValue === displayText;
                  const isLastItem = index === visibleCodes.length - 1;

                  return (
                    <CommandItem
                      key={violationCode.id}
                      ref={isLastItem ? lastTrafficViolationCodeRef : undefined}
                      value={getSearchValue(violationCode)}
                      onSelect={() => {
                        handleUpdateSearchTrafficViolationCodeInputValue({
                          trafficViolationCodeId: violationCode.id,
                          searchTrafficViolationCodeInputValue: displayText,
                          violationCode:
                            violationCode.fullCode ||
                            `${violationCode.code}-${violationCode.sub_code}`,
                          points: violationCode.points,
                        });
                      }}
                      className="cursor-pointer !p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex flex-col flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-md 
                              text-xs font-medium bg-blue-100 dark:bg-blue-900 
                            text-blue-800 dark:text-blue-200 shrink-0"
                            >
                              {violationCode.fullCode ||
                                `${violationCode.code}-${violationCode.sub_code}`}
                            </span>
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-md 
                              text-xs font-medium bg-amber-100 dark:bg-amber-900 
                            text-amber-800 dark:text-amber-200 shrink-0"
                            >
                              {violationCode.gravityLabel}
                            </span>
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-md 
                              text-xs font-medium bg-green-100 dark:bg-green-900 
                            text-green-800 dark:text-green-200 shrink-0"
                            >
                              {violationCode.points} pts
                            </span>
                          </div>

                          <p className="text-sm leading-5 break-words pr-2">
                            {violationCode.description}
                          </p>

                          <div
                            className="flex flex-col sm:flex-row sm:items-center 
                          gap-1 sm:gap-3 text-xs text-muted-foreground"
                          >
                            <span className="inline-flex items-center truncate">
                              <span
                                className="w-1.5 h-1.5 bg-muted-foreground 
                              rounded-full mr-1.5 shrink-0"
                              />
                              <span className="truncate">
                                {violationCode.violator_type}
                              </span>
                            </span>
                            <span className="inline-flex items-center truncate">
                              <span
                                className="w-1.5 h-1.5 rounded-full 
                              bg-muted-foreground mr-1.5 shrink-0"
                              />
                              <span className="truncate">
                                {violationCode.competent_agency}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Check icon */}
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 mt-1",
                            isSelected
                              ? "opacity-100 text-primary"
                              : "opacity-0",
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}

              {isFetchingTrafficViolationCodes &&
                trafficViolationCode &&
                trafficViolationCode.length > 0 &&
                !hasError && (
                  <div className="px-3 py-2">
                    <Skeleton className="w-full h-16" />
                  </div>
                )}
            </CommandGroup>

            {showSpinner && !trafficViolationCode?.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando códigos...
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

export { SearchTrafficViolationCode };
