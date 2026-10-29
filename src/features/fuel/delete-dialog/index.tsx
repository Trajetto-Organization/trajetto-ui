"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteFuel } from "@/actions/fuel/delete-fuel";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterFuelWrite } from "../form/after-write";
import { FUEL_DELETE_MILEAGE_NOTE } from "../lib/mileage-rules";

interface DeleteFuelDialogProps {
  businessId: string;
  fuelId: string;
  /** e.g. "ABC1D23 em 12/09/2026", so the person knows which one goes. */
  label: string;
  isOpen: boolean;
  onClose: () => void;
}

const CONSEQUENCES = [
  "Os dados do abastecimento (litros, valores, data e foto do odômetro) são excluídos definitivamente.",
  "O histórico e o consumo do veículo deixam de contar este abastecimento.",
  FUEL_DELETE_MILEAGE_NOTE,
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

/**
 * Deleting a refueling, in the product's confirmation (decision 3.2): the
 * consequences before the verb, Cancelar and Excluir side by side, no
 * dismissal by clicking beside it. Both copies used a raw AlertDialog with
 * the list rendered through `dangerouslySetInnerHTML`.
 */
const DeleteFuelDialog = ({
  businessId,
  fuelId,
  label,
  isOpen,
  onClose,
}: DeleteFuelDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteFuel({ businessId, fuelId });

      if (isStaleActionResult(result)) return;

      if (result.deleteFuelError) {
        toast.error(result.deleteFuelError);
        return;
      }

      toast.success(result.successMessage ?? "Abastecimento excluído.");

      void refreshAfterFuelWrite().catch(() =>
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
      title="Excluir Abastecimento"
      description={
        <>
          <p>
            Você vai excluir o abastecimento <strong>{label}</strong>.
          </p>
          <p className="font-medium text-foreground">Consequências:</p>
          <ul className="list-disc space-y-1 pl-5">
            {CONSEQUENCES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel="Excluir Abastecimento"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteFuelDialog };
