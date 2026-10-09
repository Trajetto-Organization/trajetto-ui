"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader,
  Megaphone,
  Smartphone,
  UserRound,
} from "lucide-react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

import { TextareaField } from "@/components/shared/custom/textarea-field";

import { sendChatMessage } from "@/actions/chat/send-chat-message";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import { isStaleActionResult } from "@/lib/action-result";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

import { useChatRecipients } from "./lib/use-chat-recipients";
import { describeBroadcastOutcome } from "./lib/broadcast-outcome";
import { truncateText } from "@/lib/truncate-text";

/** Hand-picked recipients per notice; "everyone" is its own audience. */
const BROADCAST_MAX_DRIVERS = 50;

/**
 * The most "everyone" may reach in one notice — the API's
 * CHAT_BROADCAST_MAX_AUDIENCE. Above it the option is closed here, instead
 * of the click being refused with CHAT_BROADCAST_TOO_LARGE afterwards.
 */
const BROADCAST_MAX_AUDIENCE = 500;

const BROADCAST_MAX_LENGTH = 2000;

type Audience = "all" | "pick";

interface BroadcastDialogProps {
  canWrite: boolean;

  /** Only the MASTER passes it; it rides into the send action. */
  actionBusinessId?: string;

  onSent: () => void;
}

/**
 * "Balança na BR-101 hoje" — the same text lands as an individual message
 * in each driver's conversation, labeled as a mass notice. Replies come back
 * one by one, in each driver's own thread.
 *
 * Decision 6.8: the audience is "todos os motoristas ativos com o app"
 * (resolved by the API, not by the pages this dialog happened to load) or a
 * hand-picked set found by a server search. Drivers without the app are
 * listed apart and are never part of the send.
 */
const BroadcastDialog = ({
  canWrite,
  actionBusinessId,
  onSent,
}: BroadcastDialogProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [open, setOpen] = useState<boolean>(false);
  const [audience, setAudience] = useState<Audience>("all");
  const [searchValue, setSearchValue] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState<string>("");

  const [isSending, setIsSending] = useState<boolean>(false);

  /**
   * "Everyone" takes two clicks: the first one only asks.
   *
   * The dialog opens on that audience, so a single click used to ring up to
   * 500 phones with no second look. Any change to the text or the audience
   * withdraws the confirmation.
   */
  const [confirmingAll, setConfirmingAll] = useState<boolean>(false);

  // One key per notice as composed (IDEMP-14), sent for one recipient too:
  // pressing "Enviar" again after an error resends THIS notice, and drivers
  // the first attempt already reached are not rung twice. Any change to the
  // text, the audience or the recipients makes it a new notice.
  const [broadcastKey, setBroadcastKey] = useState<string>(() =>
    newIdempotencyKey(),
  );

  useEffect(() => {
    setBroadcastKey(newIdempotencyKey());
    setConfirmingAll(false);
  }, [text, selectedIds, audience]);

  const term = audience === "pick" ? searchValue : "";

  const withApp = useChatRecipients({
    businessId,
    search: term,
    app: "WITH_APP",
    enabled: open,
  });

  const withoutApp = useChatRecipients({
    businessId,
    search: term,
    app: "WITHOUT_APP",
    enabled: open,
  });

  // Company-wide, from the unfiltered first page of either list.
  const withAppTotal = withApp.audience?.withApp ?? null;
  const withoutAppTotal = withApp.audience?.withoutApp ?? null;

  /**
   * Why "everyone" cannot be chosen, once the count is known: nobody has
   * the app, or more than one notice may reach. Null while it can.
   */
  const allUnavailableReason =
    withAppTotal === null
      ? null
      : withAppTotal === 0
        ? "Nenhum motorista ativo tem o aplicativo."
        : withAppTotal > BROADCAST_MAX_AUDIENCE
          ? `Mais de ${BROADCAST_MAX_AUDIENCE} motoristas com o app: escolha os destinatários.`
          : null;

  // A closed "everyone" must not stay selected under a disabled radio, with
  // the send button reading "Nenhum motorista com o app".
  useEffect(() => {
    if (allUnavailableReason && audience === "all") setAudience("pick");
  }, [allUnavailableReason, audience]);

  const toggleDriver = (driverId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(driverId)) {
        next.delete(driverId);
      } else if (next.size < BROADCAST_MAX_DRIVERS) {
        next.add(driverId);
      } else {
        toast.error(
          `No máximo ${BROADCAST_MAX_DRIVERS} motoristas escolhidos por aviso. Para todos, use "Todos os motoristas ativos com o app".`,
        );
      }

      return next;
    });
  };

  const resetAndClose = () => {
    setOpen(false);
    setAudience("all");
    setSearchValue("");

    setSelectedIds(new Set());
    setText("");
    setConfirmingAll(false);
  };

  const recipientCount =
    audience === "all"
      ? allUnavailableReason
        ? 0
        : (withAppTotal ?? 0)
      : selectedIds.size;

  const canSend =
    Boolean(text.trim()) && recipientCount > 0 && !isSending && canWrite;

  const handleSend = async () => {
    const body = text.trim();

    if (!canSend) return;

    // First click on "everyone": ask, send nothing.
    if (audience === "all" && !confirmingAll) {
      setConfirmingAll(true);
      return;
    }

    setIsSending(true);

    const result = await sendChatMessage({
      businessId: actionBusinessId,
      ...(audience === "all"
        ? { audience: "ALL_ACTIVE_WITH_APP" as const }
        : { driverIds: [...selectedIds] }),
      kind: "TEXT",
      body,
      broadcastKey,
    });

    setIsSending(false);
    setConfirmingAll(false);

    // Nothing was sent; the text stays in the dialog for after the reload.
    if (isStaleActionResult(result)) return;

    if (!result.success || !result.data) {
      toast.error(result.message);
      return;
    }

    const outcome = describeBroadcastOutcome(
      result.data.summary,
      result.data.data.length,
    );

    // Nobody reached is not a success: the dialog stays, with the text.
    if (outcome.tone === "error") {
      toast.error(outcome.message);
      return;
    }

    if (outcome.tone === "warning") {
      toast.warning(outcome.message);
    } else {
      toast.success(outcome.message);
    }

    resetAndClose();
    onSent();
  };

  const sendLabel = () => {
    if (recipientCount === 0) {
      return audience === "all"
        ? "Nenhum motorista com o app"
        : "Selecione os motoristas";
    }

    const drivers = `${recipientCount} motorista${recipientCount > 1 ? "s" : ""}`;

    return confirmingAll
      ? `Confirmar envio para ${drivers}`
      : `Enviar para ${drivers}`;
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

      <Dialog
        open={open}
        // A notice on the wire is not abandoned by ESC or the X.
        onOpenChange={(next) => !next && !isSending && resetAndClose()}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Aviso em massa
            </DialogTitle>
            <DialogDescription>
              O mesmo texto chega como mensagem individual na conversa de cada
              motorista. Só quem tem o aplicativo recebe; as respostas voltam
              separadas, uma por conversa.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
            <RadioGroup
              value={audience}
              onValueChange={(value) => setAudience(value as Audience)}
              aria-label="Para quem vai o aviso"
              className="gap-3"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem
                  id="broadcast-all"
                  value="all"
                  disabled={Boolean(allUnavailableReason)}
                  aria-describedby={
                    allUnavailableReason ? "broadcast-all-reason" : undefined
                  }
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <Label
                    htmlFor="broadcast-all"
                    className={
                      allUnavailableReason
                        ? "cursor-not-allowed text-muted-foreground"
                        : "cursor-pointer"
                    }
                  >
                    Todos os motoristas ativos com o app
                    {withAppTotal !== null && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({withAppTotal})
                      </span>
                    )}
                  </Label>
                  {allUnavailableReason && (
                    <p
                      id="broadcast-all-reason"
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      {allUnavailableReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem id="broadcast-pick" value="pick" />
                <Label htmlFor="broadcast-pick" className="cursor-pointer">
                  Escolher motoristas
                  {selectedIds.size > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({selectedIds.size} selecionado
                      {selectedIds.size > 1 ? "s" : ""})
                    </span>
                  )}
                </Label>
              </div>
            </RadioGroup>

            {audience === "pick" && (
              <div className="space-y-2">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Buscar motorista por nome..."
                  aria-label="Buscar motorista"
                  className="h-9"
                />

                <div
                  className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2"
                  aria-label="Motoristas com o aplicativo"
                  role="group"
                >
                  {withApp.isLoading && withApp.recipients.length === 0 && (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-8 w-full" />
                      ))}
                    </div>
                  )}

                  {withApp.isError && (
                    <p className="p-2 text-center text-sm text-destructive">
                      {withApp.errorMessage}
                    </p>
                  )}

                  {!withApp.isLoading &&
                    !withApp.isError &&
                    withApp.isSearchSettled &&
                    withApp.recipients.length === 0 && (
                      <p className="p-2 text-center text-sm text-muted-foreground">
                        Nenhum motorista com o aplicativo encontrado.
                      </p>
                    )}

                  {withApp.recipients.map((driver, index) => (
                    <label
                      key={driver.id}
                      ref={
                        index === withApp.recipients.length - 1
                          ? withApp.lastElementRef
                          : undefined
                      }
                      className="flex min-w-0 cursor-pointer items-center gap-2
                      rounded-md px-2 py-1.5 hover:bg-muted"
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
                    </label>
                  ))}

                  {withApp.isFetching && withApp.recipients.length > 0 && (
                    <div className="flex justify-center p-1">
                      <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Listed apart and never part of the send (decision 6.8). */}
            {(withoutAppTotal ?? 0) > 0 && (
              <section
                className="space-y-1 rounded-lg border border-dashed p-2"
                aria-label="Motoristas sem o aplicativo"
              >
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  Sem o aplicativo ({withoutAppTotal}) — não recebem o aviso
                </p>

                <ul className="max-h-24 space-y-0.5 overflow-y-auto">
                  {withoutApp.recipients.map((driver, index) => (
                    <li
                      key={driver.id}
                      ref={
                        index === withoutApp.recipients.length - 1
                          ? withoutApp.lastElementRef
                          : undefined
                      }
                      className="truncate px-1 text-xs text-muted-foreground"
                    >
                      {driver.name}
                    </li>
                  ))}

                  {!withoutApp.isLoading &&
                    withoutApp.isSearchSettled &&
                    withoutApp.recipients.length === 0 && (
                      <li className="px-1 text-xs text-muted-foreground">
                        Nenhum com esse nome.
                      </li>
                    )}
                </ul>
              </section>
            )}

            {confirmingAll && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-amber-500/40
                bg-amber-500/10 p-3 text-sm"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  O aviso vai tocar o celular de {recipientCount} motorista
                  {recipientCount > 1 ? "s" : ""} de uma vez. Confira o texto e
                  confirme para enviar.
                </p>
              </div>
            )}

            <TextareaField
              label="Mensagem *"
              htmlfor="broadcast-text"
              value={text}
              onChange={(event) =>
                setText(truncateText(event.target.value, BROADCAST_MAX_LENGTH))
              }
              placeholder="Escreva o aviso..."
              rows={3}
              className="resize-none"
              maxLength={BROADCAST_MAX_LENGTH}
              disabled={isSending}
              hint={`${text.length}/${BROADCAST_MAX_LENGTH}`}
            />
          </div>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={isSending}
            >
              Cancelar
            </Button>

            <Button type="button" disabled={!canSend} onClick={handleSend}>
              {isSending ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="mr-2 h-4 w-4" />
              )}
              {sendLabel()}
            </Button>
          </DialogFormFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { BroadcastDialog };
