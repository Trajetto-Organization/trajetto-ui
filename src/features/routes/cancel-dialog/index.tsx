"use client";

import { useState } from "react";

import { Loader } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { cancelRoute } from "@/actions/route/route-operations";
import { revalidateTagName } from "@/actions/revalidate";

import { cancelRouteSchema } from "@/schemas/create-update-route-schema";

import type { RouteListItem } from "@/actions/route/get-route";

interface CancelRouteDialogProps {
  businessId: string;
  route: RouteListItem;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Cancelling a route that already left throws away a driver's morning, so the
 * reason is required and the dialog says out loud what the cancellation will
 * do — the open stops are cancelled and their deliveries go back to the pool,
 * while what was already proven stays proven.
 */
const CancelRouteDialog = ({
  businessId,
  route,
  isOpen,
  onClose,
}: CancelRouteDialogProps): JSX.Element => {
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [isPending, setIsPending] = useState<boolean>(false);

  const openStops = route.stops.filter(
    (stop) => stop.status === "PENDING" || stop.status === "ARRIVED",
  ).length;

  const hasDeparted = route.status === "IN_PROGRESS";

  const handleCancel = async () => {
    const validation = cancelRouteSchema.safeParse({ reason });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Motivo inválido.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const response = await cancelRoute(
        businessId,
        route.id,
        validation.data.reason,
      );

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Cancelar a rota {route.code}?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {hasDeparted
                  ? "Esta rota já saiu. O motorista será avisado no aplicativo."
                  : "O motorista será avisado no aplicativo."}
              </p>

              {openStops > 0 && (
                <p>
                  {openStops === 1
                    ? "A parada que ainda não foi resolvida volta para a lista de entregas disponíveis."
                    : `As ${openStops} paradas que ainda não foram resolvidas voltam para a lista de entregas disponíveis.`}{" "}
                  O que já foi entregue ou registrado como insucesso continua
                  valendo.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="cancel-route-reason">Motivo do cancelamento *</Label>

          <Textarea
            id="cancel-route-reason"
            name="reason"
            value={reason}
            maxLength={255}
            disabled={isPending}
            placeholder="Ex.: caminhão quebrou na marginal"
            onChange={(event) => setReason(event.target.value)}
          />

          {/* Not ceremony: the only way anyone reconstructs why a morning was
          thrown away is if the person who did it said so at the time. */}
          <p className="text-xs text-muted-foreground">
            Fica registrado na rota e no histórico da operação.
          </p>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>

          <Button
            variant="destructive"
            onClick={() => void handleCancel()}
            disabled={isPending}
          >
            <span>Cancelar Rota</span>
            {isPending && (
              <div className="ml-2 animate-spin">
                <Loader className="h-4 w-4" />
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { CancelRouteDialog };
