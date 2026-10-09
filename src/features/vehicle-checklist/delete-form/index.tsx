"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteVehicleChecklist } from "@/actions/vehicle-checklist/delete-vehicle-checklist";
import { isStaleActionResult } from "@/lib/action-result";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

interface DeleteVehicleChecklistDialogProps {
  businessId: string;
  checklistId: string;
  /** How the row names it: plate and date. */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Deleting an inspection, opened from the row menu (decision 3.5: the menu
 * item opens the dialog; the dialog is not a button inside the menu).
 */
const DeleteVehicleChecklistDialog = ({
  businessId,
  checklistId,
  label,
  open,
  onOpenChange,
}: DeleteVehicleChecklistDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);
  const { revalidate } = useRevalidateScreen();

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteVehicleChecklist({
        businessId,
        checklistId,
      });

      if (isStaleActionResult(result)) return;

      if (result.deleteVehicleChecklistError) {
        toast.error(result.deleteVehicleChecklistError);
        return;
      }

      toast.success(result.successMessage ?? "Checklist excluído.");
      void revalidate();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir checklist veicular"
      destructive
      confirmLabel="Excluir checklist"
      isPending={isPending}
      onConfirm={confirm}
      description={
        <>
          <p>
            O checklist <strong>{label}</strong> será excluído permanentemente.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>As condições, os itens verificados e as fotos saem junto.</li>
            <li>O histórico de inspeções do veículo perde este registro.</li>
            <li>Motoristas não excluem checklists; só a gestão.</li>
            <li>
              A ação fica registrada nas atividades e não pode ser desfeita.
            </li>
          </ul>
        </>
      }
    />
  );
};

export { DeleteVehicleChecklistDialog };
