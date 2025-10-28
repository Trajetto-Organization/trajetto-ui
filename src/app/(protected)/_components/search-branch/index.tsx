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

import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import { useBranchInfiniteScroll } from "./hooks/branch-infinite-scroll";
import { Button } from "@/components/ui/button";

import { CommandBranchInputValue } from "../dto";
import { cn } from "@/lib/utils";

interface SearchBranchProps {
  errorBranchId?: string[];
  searchBranchInputValue: string;
  businessId: string;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  isOptional?: boolean;
}

const SearchBranch = ({
  errorBranchId,
  searchBranchInputValue,
  businessId,
  handleUpdateSearchBranchInputValue,
  isOptional,
}: SearchBranchProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    branches,
    lastElementRef: lastBranchRef,
    isLoading: isLoadingBranches,
    isFetching: isFetchingBranches,
    refetch: refetchBranches,
    hasError,
    errorMessage,
  } = useBranchInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <Label htmlFor="search-branch-input" className={errorBranchId ? "text-red-500" : ""}>
        {errorBranchId ? errorBranchId[0] : "Selecione a filial"}{" "}
        {isOptional && "(opcional)"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput id="search-branch-input" placeholder="Buscar filial..." className="h-9" />

        {!isLoadingBranches && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhuma filial disponível</div>
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

            {branches?.map((branch) => (
              <CommandItem
                key={branch.id}
                ref={lastBranchRef}
                value={branch.name}
                onSelect={() => {
                  handleUpdateSearchBranchInputValue({
                    branchId: branch.id,
                    searchBranchInputValue: branch.corporate_reason,
                  });
                }}
                className="cursor-pointer"
              >
                <span className="truncate max-w-[200px]">
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
    </div>
  );
};

export { SearchBranch };
