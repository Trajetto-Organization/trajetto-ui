"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteDriver } from "@/actions/driver/delete-driver";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterDriverWrite } from "../lib/after-write";

interface DeleteDriverDialogProps {
  businessId: string;
  driverId: string;
  /** The driver's name, so the person knows who goes. */
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * What the API checks before it deletes (delete-driver-usecase): the first
 * of these it finds refuses the delete, with that reason and its count, and
 * the answer is to deactivate.
 */
const VALIDATIONS = [
  "A exclusão é recusada se o motorista tiver usuário vinculado, multas, abastecimentos, checklists, entregas, rotas ou pausas registradas. A resposta diz o primeiro motivo encontrado e a quantidade dele.",
  "Para tirar das listas um motorista que já trabalhou, inative-o: o histórico continua dele.",
];

/** What the database does with the rows that do not block (SET NULL, CASCADE). */
const CONSEQUENCES = [
  "Os dados pessoais, de endereço e da CNH são excluídos definitivamente.",
  "Veículos que o tinham como responsável ficam sem motorista responsável.",
  "As conversas do chat com o motorista, se houver, são apagadas junto.",
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

/**
 * Deleting a driver, in the product's confirmation (decision 3.2): what is
 * checked and what follows before the verb, Cancelar and Deletar side by
 * side, no dismissal by clicking beside it.
 */
const DeleteDriverDialog = ({
  businessId,
  driverId,
  name,
  isOpen,
  onClose,
}: DeleteDriverDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteDriver({ businessId, driverId });

      if (isStaleActionResult(result)) return;

      if (result.deleteDriverError) {
        toast.error(result.deleteDriverError);
        return;
      }

      toast.success(result.successMessage ?? "Motorista deletado.");

      void refreshAfterDriverWrite().catch(() =>
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
      title="Deletar Motorista"
      description={
        <>
          <p>
            Você vai excluir o motorista <strong>{name}</strong>.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {[...VALIDATIONS, ...CONSEQUENCES].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel="Deletar Motorista"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteDriverDialog };
