"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteAccountPayable } from "@/actions/account-payable/delete-account-payable";
import { isStaleActionResult } from "@/lib/action-result";
import { formatToBrazilianCurrency } from "@/lib/format-values";

import { refreshAfterAccountPayableWrite } from "../lib/after-write";
import type { AccountPayableRow } from "../lib/server-table";
import { payeeLabel } from "../lib/stats-data";

const CHECKS = [
  "Só uma conta sem pagamento registrado pode ser excluída; se um pagamento chegar durante a exclusão, ela é recusada.",
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

interface DeleteAccountPayableDialogProps {
  bill: AccountPayableRow;
  isOpen: boolean;
  onClose: () => void;
}

/** Deleting a bill, in the product's confirmation (decision 3.2). */
const DeleteAccountPayableDialog = ({
  bill,
  isOpen,
  onClose,
}: DeleteAccountPayableDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);
  const payee = payeeLabel(bill);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteAccountPayable({
        businessId: bill.businessId,
        accountPayableId: bill.id,
      });

      if (isStaleActionResult(result)) return;

      if (result.deleteAccountPayableError) {
        toast.error(result.deleteAccountPayableError);
        return;
      }

      toast.success(result.successMessage ?? "Conta a pagar excluída.");

      void refreshAfterAccountPayableWrite("delete-account-payable").catch(() =>
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
      title="Excluir Conta a Pagar"
      description={
        <>
          <p>
            Você vai excluir a conta de{" "}
            <strong>{formatToBrazilianCurrency(bill.amount)}</strong>
            {payee ? (
              <>
                {" "}
                para <strong>{payee}</strong>
              </>
            ) : null}
            .
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
      confirmLabel="Excluir Conta"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteAccountPayableDialog };
