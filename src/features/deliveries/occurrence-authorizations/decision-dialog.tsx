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

import type { PendingAuthorization } from "@/actions/delivery/occurrence-authorizations";

import { decisionCopy, decisionNoteProblem } from "./rules";

interface DecisionDialogProps {
  request: PendingAuthorization;
  decision: "APPROVED" | "DENIED";
  isSaving: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

/**
 * Approving or denying one request. A denial asks for the reason — it is the
 * sentence the driver reads at the address. An approval of a blocking type
 * says what it does before it does it: the delivery becomes Insucesso.
 */
const DecisionDialog = ({
  request,
  decision,
  isSaving,
  onConfirm,
  onClose,
}: DecisionDialogProps): JSX.Element => {
  const [note, setNote] = useState<string>("");
  const [touched, setTouched] = useState<boolean>(false);

  const problem = decisionNoteProblem(decision, note);
  const denying = decision === "DENIED";
  const copy = decisionCopy(request, decision);

  const submit = () => {
    setTouched(true);

    if (problem) return;

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
            {request.occurrenceType.name} — {request.delivery.recipient_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{copy.effect}</p>

          <TextareaField
            label={
              denying
                ? "Motivo para o motorista *"
                : "Observação para o motorista (opcional)"
            }
            htmlfor="authorization-note"
            value={note}
            maxLength={500}
            rows={3}
            placeholder={
              denying
                ? "Ex: Deixe com o porteiro e comprove a entrega."
                : undefined
            }
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            errorName={touched ? problem : null}
            disabled={isSaving}
          />
        </div>

        <DialogFormFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
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

export { DecisionDialog };
