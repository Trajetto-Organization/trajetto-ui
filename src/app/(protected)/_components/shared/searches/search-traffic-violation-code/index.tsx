import { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Check, Loader } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { useTrafficViolationCodeInfiniteScroll } from "./hooks/traffic-violation-code-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchTrafficViolationCodeProps } from "./search-traffic-violation-code.types";
import { cn } from "@/lib/utils";

const SearchTrafficViolationCode = ({
  errorTrafficViolationCodeId,
  searchTrafficViolationCodeInputValue,
  handleUpdateSearchTrafficViolationCodeInputValue,
  isOptional,
}: SearchTrafficViolationCodeProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    trafficViolationCode,
    lastElementRef: lastTrafficViolationCodeRef,
    isLoading: isLoadingTrafficViolationCodes,
    isFetching: isFetchingTrafficViolationCodes,
    refetch: refetchTrafficViolationCodes,
    hasError,
    errorMessage,
  } = useTrafficViolationCodeInfiniteScroll();

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

  // Helper function to create display text
  const getDisplayText = (violationCode: any) => {
    return `${violationCode.fullCode || `${violationCode.code}-${violationCode.sub_code}`} - ${violationCode.description}`;
  };

  // Helper function to create search value for command filtering
  const getSearchValue = (violationCode: any) => {
    return `${violationCode.code} ${violationCode.sub_code} ${violationCode.description} ${violationCode.fullCode || ""}`;
  };

  return (
    <div className="space-y-2">
      <div
        className={`text-sm font-medium ${errorTrafficViolationCodeId ? "text-red-500" : ""}`}
      >
        {errorTrafficViolationCodeId
          ? errorTrafficViolationCodeId[0]
          : "Selecione o código de infração de trânsito"}{" "}
        {isOptional && "(opcional)"}
      </div>

      <Command className="relative border rounded-md">
        <CommandInput
          placeholder="Buscar por código ou descrição..."
          className="h-9"
          aria-label="Buscar código de infração de trânsito"
        />

        {!isLoadingTrafficViolationCodes && !hasError && (
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
              trafficViolationCode?.map((violationCode, index) => {
                const displayText = getDisplayText(violationCode);
                const isSelected =
                  searchTrafficViolationCodeInputValue === displayText;
                const isLastItem = index === trafficViolationCode.length - 1;

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
                          isSelected ? "opacity-100 text-primary" : "opacity-0",
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
    </div>
  );
};

export { SearchTrafficViolationCode };
