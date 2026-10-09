"use client";

import { useEffect, useId, useMemo, useState } from "react";
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

import { FieldShell } from "@/components/shared/custom/field-shell";
import {
  User,
  Loader,
  Check,
  ChevronsUpDown,
  AlertCircle,
  UserMinus,
} from "lucide-react";

import type { UserSelectorProps } from "./user-selector.types";
import { useUserInfiniteScroll } from "../../shared/searches/search-user/hooks/user-infinite-scroll";

import { cn } from "@/lib/utils";

const UserSelector = ({
  businessId,
  value,
  onValueChange,
  disabled = false,
  label = "Atribuir usuário (opcional)",
  placeholder = "Selecione um usuário",
  errorMessage,
}: UserSelectorProps): JSX.Element => {
  const fieldId = useId();
  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // The typed term goes to the API (FLEET-SEARCH-1): a user beyond the
  // loaded pages can be found, and cmdk does not re-filter the answer.
  const {
    users,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage: hookErrorMessage,
    refetch,
    isSearchSettled,
  } = useUserInfiniteScroll(businessId, searchValue);

  // While the answer for a new term is on its way, narrow the previous
  // term's rows locally so the list does not show stale matches.
  const filteredUsers = useMemo(() => {
    const term = searchValue.trim().toLowerCase();

    if (!users) return [];
    if (!term || isSearchSettled) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  }, [users, searchValue, isSearchSettled]);

  // The chosen user is remembered: a search can drop them from the list,
  // and the trigger must keep naming them.
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (!value || value === "none") {
      setSelectedUser(null);
      return;
    }

    const found = users?.find((user) => user.id === value);

    if (found) setSelectedUser(found);
  }, [value, users]);

  const handleUserChange = (userId: string) => {
    const chosen = users?.find((user) => user.id === userId);

    if (chosen) setSelectedUser(chosen);

    setOpen(false);
    setSearchValue(""); // Reset search on selection

    onValueChange(userId);
  };

  const handleRetry = () => {
    refetch();
  };

  // Renders the initial error state
  if (hasError && !users?.length) {
    return (
      <FieldShell label={label} htmlFor={fieldId} error={errorMessage}>
        {() => (
          <div
            id={fieldId}
            className="flex items-center gap-2 p-3 border rounded-md bg-muted/30"
          >
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive flex-1">
              {hookErrorMessage || "Erro ao carregar usuários"}
            </span>
            <Button size="sm" variant="outline" onClick={handleRetry}>
              Tentar novamente
            </Button>
          </div>
        )}
      </FieldShell>
    );
  }

  return (
    <>
      {/* The shared field shell (decisions 3.3 and 3.4): the label stays with
        its (opcional) marker and the error goes under the control; it used
        to REPLACE the label. */}
      <FieldShell label={label} htmlFor={fieldId} error={errorMessage}>
        {(control) => (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                {...control}
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  "w-full justify-between",
                  control["aria-invalid"] &&
                    "border-red-600 dark:border-red-500",
                )}
                disabled={disabled || isLoading}
              >
                {value === "none" ? (
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                    <span>Nenhum</span>
                  </div>
                ) : selectedUser ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="w-full max-w-full truncate text-left text-xs font-medium">
                        {selectedUser.name}
                      </span>
                      <span className="w-full max-w-full truncate text-left text-xs text-muted-foreground">
                        {selectedUser.email}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin opacity-50" />
                ) : (
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>

            {/* A searchable list has no natural width, so it takes the field's:
        `w-full` reads as the content's own width inside the portal. */}
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar usuário..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="h-9"
                />

                <CommandList className="max-h-[200px]">
                  {/* Initial loading state */}
                  {isLoading && !users?.length && (
                    <div className="p-2 space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                      ))}
                    </div>
                  )}

                  {/* "None" option always visible */}
                  {!isLoading && (
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => handleUserChange("none")}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <UserMinus className="h-4 w-4 text-muted-foreground" />
                          <span>Nenhum</span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            value === "none" ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {/* Empty state */}
                  {!isLoading &&
                    !hasError &&
                    isSearchSettled &&
                    filteredUsers.length === 0 && (
                      <CommandEmpty>
                        {searchValue
                          ? "Nenhum usuário encontrado."
                          : "Nenhum usuário disponível."}
                      </CommandEmpty>
                    )}

                  {/* User list */}
                  {filteredUsers.length > 0 && (
                    <CommandGroup>
                      {filteredUsers.map((user, index) => {
                        const isLast = index === filteredUsers.length - 1;

                        return (
                          <CommandItem
                            key={user.id}
                            value={user.id}
                            ref={isLast ? lastElementRef : undefined}
                            onSelect={() => handleUserChange(user.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                {/* w-full: in a column flex the span is as wide
                                as its text, and truncate never engages. */}
                                <span
                                  className="w-full max-w-full truncate text-sm font-medium"
                                  title={user.name}
                                >
                                  {user.name}
                                </span>
                                <span
                                  className="w-full max-w-full truncate text-xs text-muted-foreground"
                                  title={user.email}
                                >
                                  {user.email}
                                </span>
                              </div>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                value === user.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {/* Additional loading skeleton (infinite scroll) */}
                  {isFetching && users && users.length > 0 && (
                    <div className="p-2">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  )}

                  {/* Inline error during infinite scroll */}
                  {hasError && users && users.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between text-sm text-destructive">
                        <span>Erro ao carregar mais usuários</span>
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
        )}
      </FieldShell>

      {/* Hidden input to maintain compatibility with forms */}
      <input
        id="assignedUserId"
        type="hidden"
        name="assignedUserId"
        value={value === "none" ? "" : value}
      />
    </>
  );
};

export { UserSelector };
