"use client";

import { useState } from "react";
import { Loader, ShieldAlert } from "lucide-react";
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

import { handleDeleteFine } from "@/actions/fine/delete-fine";
import { revalidateTags } from "@/actions/revalidate";
import { isStaleActionResult } from "@/lib/action-result";

import type { FineRow } from "./lib/types";

interface DeleteFineDialogProps {
  fine: FineRow;
  isOpen: boolean;
  onClose: () => void;
}

const CONSEQUENCES = [
  "A multa e todos os seus dados são excluídos em definitivo.",
  "O motorista, o veículo e a filial não são alterados.",
  "O registro de atividades mantém a exclusão para auditoria.",
  "Os totais de multas da empresa são recalculados.",
  "Esta ação não pode ser desfeita.",
];

/**
 * Deleting a fine, opened from the row menu.
 *
 * A controlled dialog: the old copies nested the dialog's trigger inside the
 * dropdown, so closing the menu could unmount the dialog it had just opened,
 * and each copy kept its own open/close state machine. The row id and the
 * company go to the API from the row itself (a MASTER deletes in the
 * company the fine belongs to).
 */
const DeleteFineDialog = ({
  fine,
  isOpen,
  onClose,
}: DeleteFineDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const handleDelete = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteFine({
        fineId: fine.id,
        businessId: fine.businessId,
      });

      if (isStaleActionResult(result)) return;

      if ("deleteFineError" in result && result.deleteFineError) {
        toast.error(result.deleteFineError);
        return;
      }

      toast.success(
        ("successMessage" in result && result.successMessage) ||
          "Multa deletada com sucesso!",
      );
      // The list and the overview's fine count both read these tags.
      await revalidateTags(["update-fine", "update-fine-count"]);
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
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            Deletar Multa
          </AlertDialogTitle>

          <AlertDialogDescription className="pt-1 text-sm">
            Multa de {fine.trafficViolationCode.code}-
            {fine.trafficViolationCode.sub_code} do veículo{" "}
            {fine.vehicle.license_plate}, motorista {fine.driver.name}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Consequências:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {CONSEQUENCES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <DialogFormFooter className="mt-2">
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>

          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                Deletando...
              </span>
            ) : (
              "Deletar Multa"
            )}
          </Button>
        </DialogFormFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteFineDialog };
