"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteSupplier } from "@/actions/supplier/delete-supplier";
import { isStaleActionResult } from "@/lib/action-result";

import { refreshAfterSupplierWrite } from "../lib/after-write";
import type { SupplierRow } from "../lib/server-table";

const CHECKS = [
  "Se o fornecedor está em ordens de serviço, peças ou contas a pagar, a exclusão é recusada com as quantidades — excluí-lo apagaria a oficina desse histórico.",
  "A exclusão fica registrada nas atividades do sistema.",
  "Esta ação não pode ser desfeita.",
];

interface DeleteSupplierDialogProps {
  supplier: SupplierRow;
  isOpen: boolean;
  onClose: () => void;
}

/** Deleting a supplier, in the product's confirmation (decision 3.2). */
const DeleteSupplierDialog = ({
  supplier,
  isOpen,
  onClose,
}: DeleteSupplierDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteSupplier({
        businessId: supplier.businessId,
        supplierId: supplier.id,
      });

      if (isStaleActionResult(result)) return;

      // The API's refusal names what depends on the supplier; shown as is.
      if (result.deleteSupplierError) {
        toast.error(result.deleteSupplierError);
        return;
      }

      toast.success(result.successMessage ?? "Fornecedor excluído.");

      void refreshAfterSupplierWrite("delete-supplier").catch(() =>
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
      title="Excluir Fornecedor"
      description={
        <>
          <p>
            Você vai excluir o fornecedor <strong>{supplier.name}</strong>.
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
      confirmLabel="Excluir Fornecedor"
      destructive
      isPending={isPending}
      onConfirm={confirm}
    />
  );
};

export { DeleteSupplierDialog };
