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

import { useProfileInfiniteScroll } from "./hooks/profile-infinite-scroll";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { SearchProfileAccessProps } from "./dto";

const SearchProfileAccess = ({
  errorProfileAccessId,
  searchProfileAccessInputValue,
  businessId,
  handleUpdateSearchProfileAccessInputValue,
}: SearchProfileAccessProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    profiles,
    lastElementRef: lastProfileRef,
    isLoading: isLoadingProfiles,
    isFetching: isFetchingProfiles,
    refetch: refetchProfiles,
    hasError,
    errorMessage,
  } = useProfileInfiniteScroll(businessId);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingProfiles || isFetchingProfiles) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingProfiles, isFetchingProfiles, hasError]);

  return (
    <div className="space-y-2">
      <Label
        htmlFor="search-profile-access-input"
        className={errorProfileAccessId ? "text-red-500" : ""}
      >
        {errorProfileAccessId ? errorProfileAccessId[0] : "Selecione o Perfil"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput
          id="search-profile-access-input"
          placeholder="Buscar perfil..."
          className="h-9"
        />

        {!isLoadingProfiles && !hasError && (
          <CommandEmpty>
            <div className="py-6 text-center">Nenhum perfil disponível</div>
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
                {errorMessage || "Erro ao carregar os perfis"}
                <Button
                  className="h-8 mt-2"
                  variant={"outline"}
                  type="button"
                  onClick={() => refetchProfiles()}
                >
                  Revalidar Perfis
                </Button>
              </div>
            )}

            {profiles?.map((profile) => (
              <CommandItem
                key={profile.id}
                ref={lastProfileRef}
                value={profile.name}
                onSelect={() => {
                  handleUpdateSearchProfileAccessInputValue({
                    profileAccessId: profile.id,
                    searchProfileAccessInputValue: profile.name,
                  });
                }}
                className="cursor-pointer"
              >
                <span className="truncate max-w-[200px]">{profile.name}</span>
                <Check
                  className={cn(
                    "ml-auto",
                    searchProfileAccessInputValue === profile.name
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
              </CommandItem>
            ))}

            {isFetchingProfiles &&
              profiles &&
              profiles.length > 0 &&
              !hasError && <Skeleton className="w-full h-7" />}
          </CommandGroup>

          {showSpinner && !profiles?.length && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando perfis...
                </span>
              </div>
            </div>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export { SearchProfileAccess };
