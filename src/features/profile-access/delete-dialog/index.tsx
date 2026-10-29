"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteProfileAccess } from "@/actions/profile-access/delete-profile-access";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterProfileWrite } from "../lib/after-write";

interface DeleteProfileAccessDialogProps {
  profileAccessId: string;
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

const LINES = [
  "A exclusão é recusada enquanto algum usuário usar o perfil — com a quantidade. Troque o perfil dessas pessoas antes.",
  "As permissões configuradas no perfil são excluídas junto.",
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

/**
 * Deleting an access profile, in the product's confirmation (decision 3.2).
 * Deleting one in use used to leave its people unable to log in, silently.
 */
const DeleteProfileAccessDialog = ({
  profileAccessId,
  name,
  isOpen,
  onClose,
}: DeleteProfileAccessDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteProfileAccess(profileAccessId);

      if (isStaleActionResult(result)) return;

      if (result.deleteProfileAccessError) {
        toast.error(result.deleteProfileAccessError);
        return;
      }

      toast.success(result.successMessage ?? "Perfil de acesso deletado.");

      void refreshAfterProfileWrite().catch(() =>
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
      title="Deletar Perfil de Acesso"
      description={
        <>
          <p>
            Você vai excluir o perfil <strong>{name}</strong>.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel="Deletar Perfil"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteProfileAccessDialog };
