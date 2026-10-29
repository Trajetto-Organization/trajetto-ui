"use client";

import { useState } from "react";

import { Ban, Loader, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DialogFormFooter } from "@/components/ui/dialog";

import { TextareaField } from "@/components/shared/custom/textarea-field";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { cancelRoute } from "@/actions/route/route-operations";
import { revalidateTagName } from "@/actions/revalidate";
import { isStaleActionResult } from "@/lib/action-result";

import { cancelRouteSchema } from "@/schemas/create-update-route-schema";

import type { RouteListItem } from "@/actions/route/get-route";

import { cancelRouteCopy } from "../lib/cancel-copy";

interface CancelRouteDialogProps {
  businessId: string;
  route: RouteListItem;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Cancelling is how a route ends badly, and it is deliberately the only way:
 * there is no delete. A route that ran is the record of a driver's day, and
 * one that did not still reserved deliveries no other route could take.
 *
 * Same shape as Cancelar Entrega (the pattern the user approved): the title
 * in red with its icon, what is kept ("nada é apagado"), the reason, and the
 * "Validações e consequências" list — said by status, because a PLANNED
 * route's driver is never told (the API only notifies once released).
 */
const CancelRouteDialog = ({
  businessId,
  route,
  isOpen,
  onClose,
}: CancelRouteDialogProps): JSX.Element => {
  const [reason, setReason] = useState<string>("");

  // Live validation (decision 16.700) with the action's own schema: the
  // reason is checked once it is left, then as it is typed.
  const live = useLiveValidation({
    schema: cancelRouteSchema,
    values: { reason },
    controlIds: { reason: "cancel-route-reason" },
    resetKey: isOpen,
    validateOnSubmit: false,
  });

  const [isPending, setIsPending] = useState<boolean>(false);

  const openStops = route.stops.filter(
    (stop) => stop.status === "PENDING" || stop.status === "ARRIVED",
  ).length;

  const copy = cancelRouteCopy({ status: route.status, openStops });

  const handleCancel = async () => {
    const validation = cancelRouteSchema.safeParse({ reason });

    if (!live.validate() || !validation.success) return;

    setIsPending(true);

    try {
      const response = await cancelRoute(
        businessId,
        route.id,
        validation.data.reason,
      );

      if (isStaleActionResult(response)) return;

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      await revalidateTagName("update-route");
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
            <Ban className="h-5 w-5 shrink-0" aria-hidden="true" />
            Cancelar Rota {route.code}
          </AlertDialogTitle>

          <AlertDialogDescription className="pt-1 text-sm">
            {copy.description}
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
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong>Nada é apagado.</strong> A rota continua no quadro com
              status Cancelada, com as paradas, o motorista e o motivo.
            </span>
          </p>
        </div>

        <div ref={live.ref}>
          <TextareaField
            label="Motivo do cancelamento *"
            htmlfor="cancel-route-reason"
            name="reason"
            value={reason}
            maxLength={255}
            disabled={isPending}
            placeholder="Ex.: caminhão quebrou na marginal"
            errorName={live.errorOf("reason")}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {copy.consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <DialogFormFooter className="mt-2">
          <AlertDialogCancel
            disabled={isPending}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </AlertDialogCancel>

          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleCancel()}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cancelando...
              </span>
            ) : (
              "Cancelar Rota"
            )}
          </Button>
        </DialogFormFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { CancelRouteDialog };
