"use client";

import { useState } from "react";

import { Loader } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/shared/custom/textarea-field";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";

import type {
  TicketCloseOutcome,
  TicketSummary,
} from "@/actions/chat/chat.types";

import { closeNoteProblem, ticketTitle } from "../lib/ticket-rules";

interface CloseTicketDialogProps {
  ticket: Pick<TicketSummary, "number" | "subject">;
  outcome: TicketCloseOutcome;
  /** An approval of a blocking type fails the delivery: said before it is done. */
  blocksDelivery: boolean;
  isSaving: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

const COPY: Record<TicketCloseOutcome, { title: string; action: string }> = {
  RESOLVED: { title: "Encerrar atendimento", action: "Encerrar" },
  APPROVED: { title: "Autorizar e encerrar", action: "Autorizar" },
  DENIED: { title: "Negar e encerrar", action: "Negar" },
};

/**
 * Closing a ticket (design §6.1). With an authorization waiting, closing IS
 * the decision — the same rules as the tower's queue: a denial needs the
 * reason the driver reads; an approval of a blocking type says it fails the
 * delivery.
 */
const CloseTicketDialog = ({
  ticket,
  outcome,
  blocksDelivery,
  isSaving,
  onConfirm,
  onClose,
}: CloseTicketDialogProps): JSX.Element => {
  const [note, setNote] = useState<string>("");

  // Live validation (decision 16.700): a press on Cancelar is not leaving
  // the field, so closing the dialog never flashes the denial's message.
  const live = useLiveValidation({
    values: { note },
    rules: (values) => ({ note: closeNoteProblem(outcome, values.note) }),
    controlIds: { note: "close-ticket-note" },
    validateOnSubmit: false,
  });
  const copy = COPY[outcome];
  const denying = outcome === "DENIED";

  const effect =
    outcome === "RESOLVED"
      ? "O atendimento sai da lista de abertos com o seu nome como quem encerrou. Ele pode ser reaberto depois."
      : denying
        ? "Nada muda na entrega. O motorista recebe o motivo no aplicativo, na hora, e o atendimento é encerrado."
        : blocksDelivery
          ? "A entrega passa para Insucesso agora, a parada é encerrada e o embarcador é avisado. O motorista recebe a autorização e o atendimento é encerrado."
          : "O motorista recebe a autorização no aplicativo e segue com a entrega. O atendimento é encerrado.";

  const submit = () => {
    if (!live.validate()) return;

    onConfirm(note);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent
        className="max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="break-words [overflow-wrap:anywhere]">
            {ticketTitle(ticket)}
          </DialogDescription>
        </DialogHeader>

        <div ref={live.ref} className="space-y-3 text-sm">
          <p className="text-muted-foreground">{effect}</p>

          <TextareaField
            label={
              denying ? "Motivo para o motorista *" : "Observação (opcional)"
            }
            htmlfor="close-ticket-note"
            value={note}
            maxLength={500}
            rows={3}
            required={denying}
            onChange={(event) => setNote(event.target.value)}
            errorName={live.errorOf("note")}
            disabled={isSaving}
          />
        </div>

        <DialogFormFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={denying ? "destructive" : "default"}
            onClick={submit}
            disabled={isSaving}
          >
            <span>{copy.action}</span>
            {isSaving && (
              <Loader
                className="ml-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
          </Button>
        </DialogFormFooter>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CloseTicketDialog };
