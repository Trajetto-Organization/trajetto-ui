"use client";

import { useState, useMemo } from "react";

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

import { Label } from "@/components/ui/label";

import {
  User,
  Loader,
  Check,
  ChevronsUpDown,
  AlertCircle,
  UserMinus,
} from "lucide-react";

import { useUserInfiniteScroll } from "../../search-user/hooks/user-infinite-scroll";
import { cn } from "@/lib/utils";

interface UserSelectorProps {
  businessId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  errorMessage?: string[];
}

const UserSelector = ({
  businessId,
  value,
  onValueChange,
  disabled = false,
  label = "Atribuir usuário (opcional)",
  placeholder = "Selecione um usuário",
  errorMessage,
}: UserSelectorProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const {
    users,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage: hookErrorMessage,
    refetch,
  } = useUserInfiniteScroll(businessId);

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    if (!searchValue.trim()) {
      return users;
    }

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.email.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [users, searchValue]);

  // Find the current selected user
  const selectedUser = useMemo(() => {
    if (!value || value === "none" || !users) return null;
    return users.find((user) => user.id === value);
  }, [value, users]);

  const handleUserChange = (userId: string) => {
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
      <div className="space-y-2">
        <Label className={errorMessage ? "text-red-500" : ""}>
          {errorMessage ? errorMessage[0] : label}
        </Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive flex-1">
            {hookErrorMessage || "Erro ao carregar usuários"}
          </span>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label
        className={errorMessage ? "text-red-500" : ""}
        htmlFor="assignedUserId"
      >
        {errorMessage ? errorMessage[0] : label}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              errorMessage && "border-red-500",
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
                  <span className="truncate text-xs font-medium">
                    {selectedUser.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
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

        <PopoverContent className="w-full p-0" align="start">
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
              {!isLoading && !hasError && filteredUsers.length === 0 && (
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
                            <span className="truncate text-sm font-medium">
                              {user.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
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

      {/* Hidden input to maintain compatibility with forms */}
      <input
        type="hidden"
        name="assignedUserId"
        value={value === "none" ? "" : value}
      />
    </div>
  );
};

export { UserSelector };
