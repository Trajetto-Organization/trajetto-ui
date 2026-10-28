"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeletePermission } from "@/actions/permission/delete-permission";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterPermissionWrite } from "../lib/after-write";

interface DeletePermissionDialogProps {
  permissionId: string;
  /** What goes, so the person reads it before confirming. */
  name: string;
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
}

const LINES = [
  "Quem usa o perfil perde o acesso a esse recurso na hora, na web e no aplicativo.",
  "Você não pode excluir uma permissão do seu próprio perfil.",
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

/**
 * Deleting a permission, in the product's confirmation (decision 3.2): what
 * follows before the verb, Cancelar and Deletar side by side.
 */
const DeletePermissionDialog = ({
  permissionId,
  name,
  profileName,
  isOpen,
  onClose,
}: DeletePermissionDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeletePermission(permissionId);

      if (isStaleActionResult(result)) return;

      if (result.deletePermissionError) {
        toast.error(result.deletePermissionError);
        return;
      }

      toast.success(result.successMessage ?? "Permissão deletada.");

      void refreshAfterPermissionWrite().catch(() =>
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
      title="Deletar Permissão"
      description={
        <>
          <p>
            Você vai excluir a permissão <strong>{name}</strong> do perfil{" "}
            <strong>{profileName}</strong>.
          </p>
          <p className="font-medium text-foreground">Consequências:</p>
          <ul className="list-disc space-y-1 pl-5">
            {LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel="Deletar Permissão"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeletePermissionDialog };
