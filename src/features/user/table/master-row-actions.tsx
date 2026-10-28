"use client";

import { useState } from "react";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";
import { copyWithFeedback } from "@/lib/copy-with-feedback";

import type { UserRow } from "../types";

import { MasterUserFormDialog } from "../master-form-dialog";
import { DeleteUserDialog } from "../delete-dialog";
import { RevokeAccessDialog } from "../revoke-dialog";

interface MasterUserRowActionsProps {
  master: UserRow;
}

/**
 * A master's row menu in the product's standard (decision 3.5): 160px, text
 * only, the destructive act in red. Revoking and deleting used to be forms
 * rendered inside the menu; they are now items that open the confirmation.
 * The list never shows the asker, so nobody revokes or deletes themselves
 * from here (the API refuses it anyway).
 */
const MasterUserRowActions = ({
  master,
}: MasterUserRowActionsProps): JSX.Element => {
  const [open, setOpen] = useState<"edit" | "delete" | "revoke" | null>(null);

  const copy = (value: string) => {
    void copyWithFeedback(value, "ID");
  };

  const close = () => setOpen(null);

  return (
    <>
      <RowActions entity={`o master ${master.name}`}>
        <RowActionItem label="Editar Master" onSelect={() => setOpen("edit")} />
        <RowActionItem label="Copiar ID" onSelect={() => copy(master.id)} />
        <RowActionSeparator />
        <RowActionItem
          label={master.access_revoked ? "Restaurar Acesso" : "Revogar Acesso"}
          onSelect={() => setOpen("revoke")}
        />
        <RowActionItem
          label="Deletar Master"
          destructive
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "edit" && (
        <MasterUserFormDialog master={master} isOpen onClose={close} />
      )}

      {open === "revoke" && (
        <RevokeAccessDialog
          userId={master.id}
          name={master.name}
          accessRevoked={master.access_revoked}
          kind="master"
          isOpen
          onClose={close}
        />
      )}

      {open === "delete" && (
        <DeleteUserDialog
          userId={master.id}
          name={master.name}
          kind="master"
          isOpen
          onClose={close}
        />
      )}
    </>
  );
};

export { MasterUserRowActions };
