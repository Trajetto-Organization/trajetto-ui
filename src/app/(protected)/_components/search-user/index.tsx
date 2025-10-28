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

import { useUserInfiniteScroll } from "./hooks/user-infinite-scroll";
import { Button } from "@/components/ui/button";

import { CommandUserInputValue } from "../dto";

interface SearchUserProps {
  errorUserId?: string[];
  selectedUserId?: string;
  businessId: string;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
}

const SearchUser = ({
  errorUserId,
  selectedUserId,
  businessId,
  handleUpdateSearchUserInputValue,
}: SearchUserProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    users,
    lastElementRef: lastUserRef,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
    hasError,
    errorMessage,
  } = useUserInfiniteScroll(businessId);

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
    <div className="space-y-2">
      <Label htmlFor="search-user-input" className={errorUserId ? "text-red-500" : ""}>
        {errorUserId ? errorUserId[0] : "Selecione o usuário"}
      </Label>

      <Command className="h-[320px] relative border rounded-md">
        <CommandInput id="search-user-input" placeholder="Buscar usuário..." className="h-9" />

        {!isLoadingUsers && !hasError && (
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

            {users?.map((user) => (
              <CommandItem
                key={user.id}
                ref={lastUserRef}
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
    </div>
  );
};

export { SearchUser };
