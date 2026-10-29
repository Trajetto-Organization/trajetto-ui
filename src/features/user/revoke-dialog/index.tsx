"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleRevokeUserAccess } from "@/actions/user/revoke-user-access";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterUserWrite } from "../lib/after-write";

interface RevokeAccessDialogProps {
  userId: string;
  name: string;
  /** The current state: true restores, false revokes. */
  accessRevoked: boolean;
  kind?: "user" | "master";
  isOpen: boolean;
  onClose: () => void;
}

const REVOKE_LINES = [
  "O usuário deixa de entrar na web e no aplicativo; as sessões abertas são recusadas a partir da próxima ação.",
  "Os aparelhos dele deixam de receber notificações push.",
  "Ordens de serviço e contas a pagar em que ele é responsável continuam no sistema.",
  "Um administrador pode restaurar o acesso depois.",
];

const MASTER_REVOKE_LINES = [
  "O master deixa de entrar na plataforma; as sessões abertas são recusadas a partir da próxima ação.",
  "Os aparelhos dele deixam de receber notificações push.",
  "Outro master pode restaurar o acesso depois.",
];

const RESTORE_LINES = [
  "O usuário volta a entrar normalmente, com o mesmo nível de acesso e perfil.",
  "O aplicativo registra o aparelho de novo no próximo login.",
];

/**
 * Revoking or restoring access. Replaces the /admin and /dashboard copies,
 * whose lists were rendered as raw HTML and whose button changed colour but
 * not wording between the two states.
 */
const RevokeAccessDialog = ({
  userId,
  name,
  accessRevoked,
  kind = "user",
  isOpen,
  onClose,
}: RevokeAccessDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleRevokeUserAccess(userId);

      if (isStaleActionResult(result)) return;

      if (result.revokeAccessUserError) {
        toast.error(result.revokeAccessUserError);
        return;
      }

      toast.success(
        result.successMessage ??
          (accessRevoked ? "Acesso restaurado." : "Acesso revogado."),
      );

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
      title={accessRevoked ? "Restaurar Acesso" : "Revogar Acesso"}
      description={
        <>
          <p>
            {accessRevoked
              ? "Você vai restaurar o acesso de "
              : "Você vai revogar o acesso de "}
            <strong>{name}</strong>.
          </p>
          <p className="font-medium text-foreground">Consequências:</p>
          <ul className="list-disc space-y-1 pl-5">
            {(accessRevoked
              ? RESTORE_LINES
              : kind === "master"
                ? MASTER_REVOKE_LINES
                : REVOKE_LINES
            ).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
      confirmLabel={accessRevoked ? "Restaurar Acesso" : "Revogar Acesso"}
      destructive={!accessRevoked}
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { RevokeAccessDialog };
