"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteFuelType } from "@/actions/fuel-type/delete-fuel-type";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterFuelTypeWrite } from "../lib/after-write";
import type { FuelTypeRow } from "../lib/types";

const CHECKS = [
  "Se algum veículo usa este combustível, a exclusão é recusada com a quantidade.",
  "Se há abastecimentos com este combustível, a exclusão é recusada com a quantidade — o histórico continua dizendo de que combustível era cada um.",
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

interface DeleteFuelTypeDialogProps {
  fuelType: FuelTypeRow;
  isOpen: boolean;
  onClose: () => void;
}

/** Deleting a fuel type, in the product's confirmation (decision 3.2). */
const DeleteFuelTypeDialog = ({
  fuelType,
  isOpen,
  onClose,
}: DeleteFuelTypeDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteFuelType({
        businessId: fuelType.businessId,
        fuelTypeId: fuelType.id,
      });

      if (isStaleActionResult(result)) return;

      if (result.deleteFuelTypeError) {
        toast.error(result.deleteFuelTypeError);
        return;
      }

      toast.success(result.successMessage ?? "Tipo de combustível excluído.");

      void refreshAfterFuelTypeWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
      title="Excluir Tipo de Combustível"
      description={
        <>
          <p>
            Você vai excluir o combustível{" "}
            <strong>{fuelType.description}</strong>.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {CHECKS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel="Excluir Combustível"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteFuelTypeDialog };
