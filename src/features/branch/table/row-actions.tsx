"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";
import { toast } from "sonner";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { BranchFormDialog } from "../form-dialog";
import { DeleteBranchDialog } from "../delete-dialog";
import type { BranchScope } from "../lib/scope";
import type { BranchRow } from "../lib/server-table";

const NO_WRITE = "Você não tem permissão para alterar filiais.";

/**
 * The row menu (decision 3.5): 160px, text only, the destructive act in red,
 * blocked actions disabled with the reason. The admin copy offered edit and
 * delete with no permission check; "Copiar ID da empresa" stays for the
 * MASTER only, who works across companies.
 */
const BranchRowActions = ({
  row,
  scope,
}: {
  row: Row<BranchRow>;
  scope: BranchScope;
}): JSX.Element => {
  const branch = row.original;

  const [open, setOpen] = useState<"update" | "delete" | null>(null);
  const canWrite = useHasPermission(permissions.BRANCH_MANAGE, "write");

  const copy = (value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("ID copiado para a área de transferência!"))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  return (
    <>
      <RowActions entity={`a filial ${branch.corporate_reason}`}>
        <RowActionItem
          label="Editar Filial"
          blockedReason={canWrite ? null : NO_WRITE}
          onSelect={() => setOpen("update")}
        />
        <RowActionItem label="Copiar ID" onSelect={() => copy(branch.id)} />
        {scope === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(branch.businessId)}
          />
        )}

        <RowActionSeparator />

        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={canWrite ? null : NO_WRITE}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "update" && (
        <BranchFormDialog
          businessId={branch.businessId}
          branch={branch}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}

      {open === "delete" && (
        <DeleteBranchDialog
          branch={branch}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
};

export { BranchRowActions };
