"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteUserRegistration } from "@/actions/user/delete-user-registration";
import { handleDeleteMasterUser } from "@/actions/user/delete-master-user";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterUserWrite } from "../lib/after-write";

interface DeleteUserDialogProps {
  userId: string;
  /** Who goes, so the person reads the name before confirming. */
  name: string;
  /** A MASTER account goes through its own route and rules. */
  kind?: "user" | "master";
  isOpen: boolean;
  onClose: () => void;
}

/** What the API checks before it deletes (delete-user-usecase). */
const USER_LINES = [
  "A exclusão é recusada se o usuário for responsável por ordens de serviço ou por contas a pagar — com a quantidade de cada uma. Nesse caso, revogue o acesso: o histórico continua dele.",
  "Todas as sessões e aparelhos do usuário são encerrados.",
  "As notificações dele são excluídas; o registro de atividades é mantido.",
  "Esta ação não pode ser desfeita.",
];

const MASTER_LINES = [
  "O último usuário master da plataforma não pode ser excluído.",
  "Todas as sessões e aparelhos dele são encerrados.",
  "Esta ação não pode ser desfeita.",
];

/**
 * Deleting a user, in the product's confirmation (decision 3.2): what is
 * checked and what follows before the verb, Cancelar and Deletar side by
 * side, no dismissal by clicking beside it.
 */
const DeleteUserDialog = ({
  userId,
  name,
  kind = "user",
  isOpen,
  onClose,
}: DeleteUserDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result =
        kind === "master"
          ? await handleDeleteMasterUser(userId)
          : await handleDeleteUserRegistration(userId);

      if (isStaleActionResult(result)) return;

      const error =
        "deleteUserError" in result
          ? result.deleteUserError
          : "deleteMasterUserError" in result
            ? result.deleteMasterUserError
            : undefined;

      if (error) {
        toast.error(error);
        return;
      }

      toast.success(result.successMessage ?? "Usuário deletado.");

      void refreshAfterUserWrite().catch(() =>
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
      title={kind === "master" ? "Deletar Usuário Master" : "Deletar Usuário"}
      description={
        <>
          <p>
            Você vai excluir <strong>{name}</strong>.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(kind === "master" ? MASTER_LINES : USER_LINES).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel={kind === "master" ? "Deletar Master" : "Deletar Usuário"}
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteUserDialog };
