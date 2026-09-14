"use client";

import { useState } from "react";
import { Loader, Megaphone, UserRound } from "lucide-react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { useDriverInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-driver/hooks/driver-infinite-scroll";
import { sendChatMessage } from "@/actions/chat/send-chat-message";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

const BROADCAST_MAX_DRIVERS = 50;

interface BroadcastDialogProps {
  canWrite: boolean;

  /** Only the MASTER passes it; it rides into the send action. */
  actionBusinessId?: string;

  onSent: () => void;
}

/**
 * "Balança na BR-101 hoje" — the same text lands as an individual message
 * in each chosen driver's conversation, labeled as a mass notice. Replies
 * come back one by one, in each driver's own thread.
 */
const BroadcastDialog = ({
  canWrite,
  actionBusinessId,
  onSent,
}: BroadcastDialogProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState<string>("");

  const [isSending, setIsSending] = useState<boolean>(false);

  // Same key as the new-conversation popover: one shared cache, one fetch.
  const { drivers, lastElementRef, isLoading, isFetching } =
    useDriverInfiniteScroll(businessId ?? "");

  const term = searchValue.toLowerCase();

  const filteredDrivers = (drivers ?? []).filter((driver: any) =>
    [driver.name, driver.cnh ?? ""].some((field: string) =>
      field.toLowerCase().includes(term),
    ),
  );

  const toggleDriver = (driverId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(driverId)) {
        next.delete(driverId);
      } else if (next.size < BROADCAST_MAX_DRIVERS) {
        next.add(driverId);
      } else {
        toast.error(
          `No máximo ${BROADCAST_MAX_DRIVERS} motoristas por aviso.`,
        );
      }

      return next;
    });
  };

  const resetAndClose = () => {
    setOpen(false);
    setSearchValue("");

    setSelectedIds(new Set());
    setText("");
  };

  const handleSend = async () => {
    const body = text.trim();

    if (!body || selectedIds.size === 0 || isSending) return;

    setIsSending(true);

    const result = await sendChatMessage({
      businessId: actionBusinessId,
      driverIds: [...selectedIds],
      kind: "TEXT",
      body,
    });

    setIsSending(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(
      `Aviso enviado para ${selectedIds.size} motorista${
        selectedIds.size > 1 ? "s" : ""
      }!`,
    );

    resetAndClose();
    onSent();
  };

  return (
    <>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canWrite || !businessId}
                onClick={() => setOpen(true)}
                aria-label="Aviso em massa"
              >
                <Megaphone className="h-4 w-4" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {canWrite
              ? "Aviso em massa"
              : "Você precisa da permissão de escrita em Gerenciar Entregas"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Aviso em massa
            </DialogTitle>
            <DialogDescription>
              O mesmo texto chega como mensagem individual na conversa de
              cada motorista selecionado. As respostas voltam separadas, uma
              por conversa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar motorista..."
              className="h-9"
            />

            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2">
              {isLoading && !drivers?.length && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </div>
              )}

              {!isLoading && filteredDrivers.length === 0 && (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  Nenhum motorista ativo encontrado.
                </p>
              )}

              {filteredDrivers.map((driver: any, index: number) => (
                <label
                  key={driver.id}
                  ref={
                    index === filteredDrivers.length - 1
                      ? (lastElementRef as never)
                      : undefined
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-md
                  px-2 py-1.5 hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedIds.has(driver.id)}
                    onCheckedChange={() => toggleDriver(driver.id)}
                    aria-label={`Selecionar ${driver.name}`}
                  />
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {driver.name}
                  </span>
                  {driver.cnh && (
                    <span className="text-xs text-muted-foreground">
                      CNH: {driver.cnh}
                    </span>
                  )}
                </label>
              ))}

              {isFetching && drivers && drivers.length > 0 && (
                <div className="flex justify-center p-1">
                  <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 2000))}
              placeholder="Escreva o aviso..."
              rows={3}
              className="resize-none"
              aria-label="Texto do aviso"
            />

            <Button
              type="button"
              className="w-full"
              disabled={!text.trim() || selectedIds.size === 0 || isSending}
              onClick={handleSend}
            >
              {isSending ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="mr-2 h-4 w-4" />
              )}
              {selectedIds.size > 0
                ? `Enviar para ${selectedIds.size} motorista${
                    selectedIds.size > 1 ? "s" : ""
                  }`
                : "Selecione os motoristas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { BroadcastDialog };
