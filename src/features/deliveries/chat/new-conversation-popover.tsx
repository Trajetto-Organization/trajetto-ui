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

import { useDriverInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-driver/hooks/driver-infinite-scroll";
import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

interface NewConversationPopoverProps {
  canWrite: boolean;
  onPickDriver: (driver: { id: string; name: string; cnh?: string }) => void;
}

/**
 * First contact: pick any active driver and start talking. The thread only
 * comes to exist on the first message — picking costs nothing.
 */
const NewConversationPopover = ({
  canWrite,
  onPickDriver,
}: NewConversationPopoverProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // The endpoint scopes to the session's company when no id is passed, so
  // the empty fallback only ever happens where the button is disabled.
  const { drivers, lastElementRef, isLoading, isFetching } =
    useDriverInfiniteScroll(businessId ?? "");

  const term = searchValue.toLowerCase();

  const filteredDrivers = (drivers ?? []).filter((driver: any) =>
    [driver.name, driver.cnh ?? ""].some((field: string) =>
      field.toLowerCase().includes(term),
    ),
  );

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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar motorista..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />

          <CommandList className="max-h-[240px]">
            {isLoading && !drivers?.length && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full" />
                ))}
              </div>
            )}

            {!isLoading && filteredDrivers.length === 0 && (
              <CommandEmpty>Nenhum motorista ativo encontrado.</CommandEmpty>
            )}

            {filteredDrivers.length > 0 && (
              <CommandGroup>
                {filteredDrivers.map((driver: any, index: number) => (
                  <CommandItem
                    key={driver.id}
                    value={driver.id}
                    ref={
                      index === filteredDrivers.length - 1
                        ? lastElementRef
                        : undefined
                    }
                    onSelect={() => {
                      onPickDriver({
                        id: driver.id,
                        name: driver.name,
                        cnh: driver.cnh,
                      });

                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="cursor-pointer"
                  >
                    <UserRound className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{driver.name}</span>
                      {driver.cnh && (
                        <span className="truncate text-xs text-muted-foreground">
                          CNH: {driver.cnh}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isFetching && drivers && drivers.length > 0 && (
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
