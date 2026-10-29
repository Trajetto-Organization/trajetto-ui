"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { SupplierFormDialog } from "../form-dialog";
import { DeleteSupplierDialog } from "../delete-dialog";
import type { SupplierRow } from "../lib/server-table";

const NO_WRITE = "Você não tem permissão para alterar fornecedores.";

/**
 * The row menu (decision 3.5): 160px, text only, the destructive act in red,
 * blocked actions disabled with the reason. The admin copy offered edit and
 * delete with no permission check and a "Copiar ID da empresa" (the company
 * is the one selected at the top now).
 */
const SupplierRowActions = ({
  row,
}: {
  row: Row<SupplierRow>;
}): JSX.Element => {
  const supplier = row.original;

  const [open, setOpen] = useState<"update" | "delete" | null>(null);
  const canWrite = useHasPermission(permissions.SUPPLIER_MANAGE, "write");

  const copyId = () => {
    void copyWithFeedback(supplier.id, "ID");
  };

  return (
    <>
      <RowActions entity={`o fornecedor ${supplier.name}`}>
        <RowActionItem
          label="Editar Fornecedor"
          blockedReason={canWrite ? null : NO_WRITE}
          onSelect={() => setOpen("update")}
        />
        <RowActionItem label="Copiar ID" onSelect={copyId} />

        <RowActionSeparator />

        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={canWrite ? null : NO_WRITE}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "update" && (
        <SupplierFormDialog
          businessId={supplier.businessId}
          supplier={supplier}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}

      {open === "delete" && (
        <DeleteSupplierDialog
          supplier={supplier}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
};

export { SupplierRowActions };
