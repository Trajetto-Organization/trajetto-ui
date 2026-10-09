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
import { cn } from "@/lib/utils";

import { useUserInfiniteScroll } from "./hooks/user-infinite-scroll";
import { Button } from "@/components/ui/button";

import type { SearchUserProps } from "./search-user.types";

const SearchUser = ({
  errorUserId,
  selectedUserId,
  businessId,
  handleUpdateSearchUserInputValue,
  isOptional,
}: SearchUserProps): JSX.Element => {
  const fieldId = useId();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // The typed term goes to the API (FLEET-SEARCH-1): it matches name and
  // e-mail over the whole company, not only the pages already loaded.
  const [search, setSearch] = useState<string>("");

  const {
    users,
    lastElementRef: lastUserRef,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
    hasError,
    errorMessage,
    isSearchSettled,
  } = useUserInfiniteScroll(businessId, search);

  // While the server's answer for the new term is on the way, the rows on
  // screen are narrowed here so the list does not lag behind the typing.
  const visibleUsers = useMemo(() => {
    if (!search || isSearchSettled) return users ?? [];

    const term = search.toLowerCase();

    return (users ?? []).filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        String(user.email ?? "")
          .toLowerCase()
          .includes(term),
    );
  }, [users, search, isSearchSettled]);

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoadingUsers || isFetchingUsers) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoadingUsers, isFetchingUsers, hasError]);

  return (
    /*
      The shared field shell (decisions 3.3 and 3.4): the label stays and
      carries the required/optional marker, the error goes under the list,
      and the search input is marked invalid/required for a screen reader.
      It used to be the old pattern — the error REPLACED the label.
    */
    <FieldShell
      label={`Selecione o usuário ${isOptional ? "(opcional)" : "*"}`}
      htmlFor={fieldId}
      // cmdk owns the input id; the visible label is text, cmdk names the input.
      labelTargetsControl={false}
      error={errorUserId}
    >
      {(control) => (
        <Command
          // cmdk owns the input's id and labels it with this text.
          label="Selecione o usuário"
          // The server already filtered by the term, e-mail included, which
          // is not in the item text cmdk would match against.
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
            placeholder="Buscar por nome ou e-mail..."
            className="h-9"
            aria-label="Buscar usuário"
          />

          {!isLoadingUsers && !hasError && visibleUsers.length === 0 && (
            <CommandEmpty>
              <div className="py-6 text-center">Nenhum usuário disponível</div>
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
                  {errorMessage || "Erro ao carregar os usuários"}
                  <Button
                    className="h-8 mt-2"
                    variant={"outline"}
                    type="button"
                    onClick={() => refetchUsers()}
                  >
                    Revalidar Usuários
                  </Button>
                </div>
              )}

              {visibleUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  ref={lastUserRef}
                  value={user.id}
                  onSelect={() => {
                    handleUpdateSearchUserInputValue({
                      userId: user.id,
                      searchUserInputValue: user.name,
                      responsibleUserEmail: user.email,
                    });
                  }}
                  className="cursor-pointer"
                >
                  {user.name}
                  <span className="text-xs text-muted-foreground ml-2">
                    (E-mail: {user.email})
                  </span>
                  {selectedUserId === user.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}

              {isFetchingUsers && users && users.length > 0 && !hasError && (
                <Skeleton className="w-full h-7" />
              )}
            </CommandGroup>

            {showSpinner && !users?.length && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando usuários...
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

export { SearchUser };
