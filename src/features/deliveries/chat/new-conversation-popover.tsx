"use client";

import { useState } from "react";
import { Loader, MessageSquarePlus, UserRound } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { useChatRecipients } from "./lib/use-chat-recipients";

interface NewConversationPopoverProps {
  canWrite: boolean;
  onPickDriver: (driver: { id: string; name: string; cnh?: string }) => void;
}

/**
 * First contact: pick any active driver and start talking. The thread only
 * comes to exist on the first message — picking costs nothing.
 *
 * The list is the chat's own (`/chat/recipients`, delivery_manage:read) and
 * searched on the server: a driver beyond the loaded page is found by name or
 * CNH, and a tower user without the driver registry sees it too.
 */
const NewConversationPopover = ({
  canWrite,
  onPickDriver,
}: NewConversationPopoverProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const {
    recipients,
    lastElementRef,
    isLoading,
    isFetching,
    isError,
    errorMessage,
    isSearchSettled,
  } = useChatRecipients({ businessId, search: searchValue, enabled: open });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canWrite || !businessId}
                  aria-label="Nova conversa"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {canWrite
              ? "Nova conversa"
              : "Você precisa da permissão de escrita em Gerenciar Entregas"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-72 p-0" align="start">
        {/* The server answers the search; cmdk must not filter it again. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar motorista por nome..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />

          <CommandList className="max-h-[240px]">
            {isLoading && recipients.length === 0 && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full" />
                ))}
              </div>
            )}

            {isError && (
              <p className="p-3 text-center text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            {!isLoading &&
              !isError &&
              isSearchSettled &&
              recipients.length === 0 && (
                <CommandEmpty>Nenhum motorista ativo encontrado.</CommandEmpty>
              )}

            {recipients.length > 0 && (
              <CommandGroup>
                {recipients.map((driver, index) => (
                  <CommandItem
                    key={driver.id}
                    value={driver.id}
                    ref={
                      index === recipients.length - 1
                        ? lastElementRef
                        : undefined
                    }
                    onSelect={() => {
                      onPickDriver({ id: driver.id, name: driver.name });

                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="cursor-pointer"
                  >
                    <UserRound className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{driver.name}</span>
                      {/* A conversation still opens: the thread waits for
                          the account, and the pane says he has no app. */}
                      {!driver.hasApp && (
                        <span className="truncate text-xs text-muted-foreground">
                          Sem o aplicativo
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isFetching && recipients.length > 0 && (
              <div className="flex justify-center p-2">
                <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { NewConversationPopover };
