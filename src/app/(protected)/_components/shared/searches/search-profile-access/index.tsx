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

import { useProfileInfiniteScroll } from "./hooks/profile-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchProfileAccessProps } from "./search-profile-access.types";
import { cn } from "@/lib/utils";

const SearchProfileAccess = ({
  errorProfileAccessId,
  searchProfileAccessInputValue,
  businessId,
  editableOnly = false,
  handleUpdateSearchProfileAccessInputValue,
}: SearchProfileAccessProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // The typed term goes to the API (FLEET-SEARCH-1): it matches the name
  // over the whole company, not only the pages already loaded.
  const [search, setSearch] = useState<string>("");

  const {
    profiles,
    lastElementRef: lastProfileRef,
    isLoading: isLoadingProfiles,
    isFetching: isFetchingProfiles,
    refetch: refetchProfiles,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useProfileInfiniteScroll(businessId, search, editableOnly);

  // While the server's answer for the new term is on the way, the rows on
  // screen are narrowed here so the list does not lag behind the typing.
  const visibleProfiles = useMemo(() => {
    if (!search || isSearchSettled) return profiles ?? [];

    const term = search.toLowerCase();

    return (profiles ?? []).filter((profile) =>
      profile.name.toLowerCase().includes(term),
    );
  }, [profiles, search, isSearchSettled]);

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
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={"Selecione o perfil de acesso *"}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorProfileAccessId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o perfil de acesso"
          // The server already filtered by the term.
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
            placeholder="Buscar perfil pelo nome..."
            className="h-9"
            aria-label="Buscar perfil"
          />

          {!isLoadingProfiles && !hasError && visibleProfiles.length === 0 && (
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

              {visibleProfiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  ref={lastProfileRef}
                  value={profile.id}
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
      )}
    </FieldShell>
  );
};

export { SearchProfileAccess };
