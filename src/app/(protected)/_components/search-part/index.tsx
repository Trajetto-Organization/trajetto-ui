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

import { usePartInfiniteScroll } from "./hooks/part-infinite-scroll";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { SearchPartProps } from "./dto";

const SearchPart = ({
  errorPartId,
  searchPartInputValue,
  businessId,
  handleUpdateSearchPartInputValue,
}: SearchPartProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    parts,
    lastElementRef: lastPartRef,
    isLoading: isLoadingParts,
    isFetching: isFetchingParts,
    refetch: refetchParts,
    hasError,
    errorMessage,
  } = usePartInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <Label
        htmlFor="search-part-input"
        className={errorPartId ? "text-red-500" : ""}
      >
        {errorPartId ? errorPartId[0] : "Selecione a peça"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput
          id="search-part-input"
          placeholder="Buscar peça..."
          className="h-9"
        />

        {!isLoadingParts && !hasError && (
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

            {parts?.map((part) => (
              <CommandItem
                key={part.id}
                ref={lastPartRef}
                value={part.description}
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

            {isFetchingParts && parts && parts.length > 0 && !hasError && (
              <Skeleton className="w-full h-7" />
            )}
          </CommandGroup>

          {showSpinner && !parts?.length && (
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
    </div>
  );
};

export { SearchPart };
