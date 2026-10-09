"use client";

import { useState } from "react";
import { Ban, Loader, ShieldCheck } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";

import { updateDeliveryStatus } from "@/actions/delivery/update-delivery-status";
import { revalidateTagName } from "@/actions/revalidate";
import { isStaleActionResult } from "@/lib/action-result";

import { StatusReasonSelector } from "@/app/(protected)/_components/shared/selectors/status-reason-selector";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";

interface CancelDeliveryDialogProps {
  businessId: string;
  deliveryId: string;
  recipientName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Cancelling is how a delivery ends badly, and it is deliberately the only
 * way: there is no delete.
 *
 * A delivery carries an NFe, occurrences recorded in the field and a signed
 * receipt — erasing it would destroy the proof that it happened. CANCELLED is
 * a final state that keeps every one of those and takes the delivery out of
 * the operation, which is what the user actually wants.
 *
 * The dialog says that plainly, because "cancelar" reads like "apagar" to
 * most people and the hesitation is the same one the module toggle had.
 */
const CancelDeliveryDialog = ({
  businessId,
  deliveryId,
  recipientName,
  isOpen,
  onClose,
}: CancelDeliveryDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  // Cancelling is a status override like any other, and the one whose reason
  // gets asked about most: three days later this is the only record of why a
  // delivery the customer was expecting never went out.
  const [reasonId, setReasonId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // Live validation (decision 16.700): "Cancelar Entrega" is enabled and,
  // without a reason, says so under the select and focuses it (16.701).
  const live = useLiveValidation({
    values: { reasonId },
    rules: () => ({
      reasonId: reasonId ? null : "Escolha o motivo do cancelamento.",
    }),
    resetKey: isOpen,
    validateOnSubmit: false,
  });

  const handleCancel = async () => {
    if (!live.validate() || !reasonId) return;

    setIsPending(true);

    try {
      const result = await updateDeliveryStatus(
        businessId,
        deliveryId,
        "CANCELLED",
        { reasonId, note: note || undefined },
      );

      if (isStaleActionResult(result)) return;

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await revalidateTagName("update-delivery");

      onClose();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl text-destructive">
            <Ban className="h-5 w-5 shrink-0" />
            Cancelar Entrega
          </AlertDialogTitle>

          <AlertDialogDescription className="pt-1 text-sm">
            A entrega para{" "}
            <strong title={recipientName}>{recipientName}</strong> sai da
            operação e não poderá mais mudar de status.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50
          p-3 dark:border-emerald-900 dark:bg-emerald-950/30"
        >
          <p
            className="flex items-start gap-2 text-sm
            text-emerald-800 dark:text-emerald-200"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Nada é apagado.</strong> A entrega continua na listagem
              com status Cancelada, e os itens, a NF-e e as ocorrências
              registradas permanecem no histórico.
            </span>
          </p>
        </div>

        {/* The select's id is generated: the wrapper names the field. The
            note comes after it, so leaving the note has passed the reason. */}
        <div ref={live.ref} data-live-field="reasonId">
          <StatusReasonSelector
            businessId={businessId}
            reasonId={reasonId}
            onReasonChange={(next) => {
              setReasonId(next);
              live.touch("reasonId");
            }}
            note={note}
            onNoteChange={setNote}
            disabled={isPending}
            error={live.messageOf("reasonId") ?? undefined}
          />
        </div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• Cancelada é um estado final: não há como voltar atrás.</li>
          <li>• A entrega deixa de aparecer para o motorista no app.</li>
          <li>
            • Se a nota fiscal estava errada, crie uma nova entrega depois de
            cancelar esta.
          </li>
        </ul>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full sm:w-auto"
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // Kept open until the request settles, so a failure is visible
              // instead of closing over a delivery that did not change.
              event.preventDefault();
              void handleCancel();
            }}
            className="w-full bg-destructive text-destructive-foreground
            hover:bg-destructive/90 sm:w-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Cancelando...
              </span>
            ) : (
              "Cancelar Entrega"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { CancelDeliveryDialog };
