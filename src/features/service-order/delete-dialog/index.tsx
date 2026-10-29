"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { handleDeleteServiceOrder } from "@/actions/service-order/delete-service-order";
import { guardFormAction } from "@/lib/action-result";

import { refreshMaintenanceData } from "../lib/refresh";
import { deleteBlockedReason } from "../lib/service-order-rules";
import type { ServiceOrderRow } from "../server-table";

interface DeleteServiceOrderDialogProps {
  serviceOrder: ServiceOrderRow;
  isOpen: boolean;
  onClose: () => void;
}

interface DeleteState {
  deleteServiceOrderError?: string;
  successMessage?: string;
}

const Consequences = ({ order }: { order: ServiceOrderRow }): JSX.Element => {
  const parts = order.parts_count ?? order.parts?.length ?? 0;

  return (
    <ul className="mt-2 list-disc space-y-1 pl-5">
      <li>
        <strong>Validação prévia:</strong> a exclusão é recusada se a ordem
        estiver concluída ou se houver conta a pagar vinculada a ela.
      </li>
      <li>
        {parts > 0
          ? `As ${parts} peça(s) lançada(s) nesta ordem serão removidas junto; o catálogo de peças não muda.`
          : "Nenhuma peça foi lançada nesta ordem."}
      </li>
      <li>O card desta ordem no Kanban, se houver, continua lá.</li>
      <li>Esta ação será registrada nos logs de atividade do sistema.</li>
      <li>Esta ação não pode ser desfeita.</li>
    </ul>
  );
};

const DeleteButton = ({ blocked }: { blocked: boolean }): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
      <Button type="submit" disabled={pending || blocked} variant="destructive">
        <ShieldAlert className="mr-1 size-5" />
        <span>Excluir Ordem de Serviço</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </>
  );
};

/**
 * Deleting a service order, with what is checked and what goes with it
 * (FLEET-SO-1). A finished order or one a bill points at cannot go; the
 * dialog says why before the API does, and the API decides again under a
 * lock.
 */
const DeleteServiceOrderDialog = ({
  serviceOrder,
  isOpen,
  onClose,
}: DeleteServiceOrderDialogProps): JSX.Element => {
  const [state, dispatch] = useFormState<DeleteState | null, FormData>(
    guardFormAction(() =>
      handleDeleteServiceOrder({
        businessId: serviceOrder.businessId,
        serviceOrderId: serviceOrder.id,
      }),
    ),
    null,
  );

  const answered = useRef<DeleteState | null>(null);

  useEffect(() => {
    if (!state || answered.current === state) return;
    answered.current = state;

    if (state.deleteServiceOrderError) {
      toast.error(state.deleteServiceOrderError);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);
      onClose();

      refreshMaintenanceData(["service_order", "vehicleData"]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const blockedReason = deleteBlockedReason(serviceOrder);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-background">
        <form action={dispatch}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {blockedReason ? (
                  <p className="font-medium text-destructive">
                    {blockedReason}
                  </p>
                ) : (
                  <p>
                    Esta ação removerá permanentemente a ordem de serviço
                    {serviceOrder.vehicle?.license_plate
                      ? ` do veículo ${serviceOrder.vehicle.license_plate}`
                      : ""}
                    .
                  </p>
                )}
                <span className="mt-4 block font-medium text-foreground">
                  Validações e consequências:
                </span>
                <Consequences order={serviceOrder} />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5">
            <DeleteButton blocked={blockedReason !== null} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteServiceOrderDialog };
