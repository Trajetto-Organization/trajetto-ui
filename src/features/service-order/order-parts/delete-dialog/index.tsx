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

import { handleDeleteServiceOrderPart } from "@/actions/service-order-part/delete-service-order-part";
import { guardFormAction } from "@/lib/action-result";
import { formatToBrazilianCurrency } from "@/lib/format-values";

import { refreshMaintenanceData } from "../../lib/refresh";
import { lineTotals, type OrderPartRow } from "../lib/order-part-rules";

interface DeleteState {
  deleteServiceOrderPartError?: string;
  successMessage?: string;
}

const Footer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
      <Button type="submit" disabled={pending} variant="destructive">
        <ShieldAlert className="mr-1 size-5" />
        <span>Remover da Ordem</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </>
  );
};

/** Removing a part line from its order; the catalog keeps the part. */
const DeleteOrderPartDialog = ({
  line,
  isOpen,
  onClose,
}: {
  line: OrderPartRow;
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element => {
  const [state, dispatch] = useFormState<DeleteState | null, FormData>(
    guardFormAction(() =>
      handleDeleteServiceOrderPart({
        businessId: line.businessId,
        serviceOrderId: line.serviceOrderId,
        serviceOrderPartId: line.id,
      }),
    ),
    null,
  );

  const answered = useRef<DeleteState | null>(null);

  useEffect(() => {
    if (!state || answered.current === state) return;
    answered.current = state;

    if (state.deleteServiceOrderPartError) {
      toast.error(state.deleteServiceOrderPartError);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);
      onClose();

      refreshMaintenanceData("update-service-order-part", [
        "service_order",
        "part",
      ]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-background">
        <form action={dispatch}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover Peça da Ordem de Serviço
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Remove o lançamento de{" "}
                  <span className="font-medium text-foreground">
                    {line.part.description}
                  </span>{" "}
                  ({line.quantity} ×{" "}
                  {formatToBrazilianCurrency(line.unit_price)}) da ordem de
                  serviço do veículo {line.serviceOrder.vehicle.license_plate}.
                </p>
                <span className="mt-4 block font-medium text-foreground">
                  Consequências:
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    A soma das peças da ordem cai{" "}
                    {formatToBrazilianCurrency(lineTotals(line).net)}; o valor
                    total digitado da ordem não muda.
                  </li>
                  <li>A peça continua no catálogo.</li>
                  <li>
                    Esta ação será registrada nos logs de atividade do sistema.
                  </li>
                  <li>Esta ação não pode ser desfeita.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5">
            <Footer />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteOrderPartDialog };
