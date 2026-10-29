"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";
import { shortId } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { AccountPayableFormDialog } from "../form-dialog";
import { DeleteAccountPayableDialog } from "../delete-dialog";
import type { AccountPayableRow } from "../lib/server-table";
import { isDeletable } from "../lib/status";

const PAID_REASON =
  "Conta com pagamento registrado não é excluída: é registro financeiro.";

/**
 * The row menu (decision 3.5): 160px, text only, the destructive act in red,
 * blocked actions disabled with the reason. Editing needs the bill's write
 * plus reading branches and users (the form's required pickers) — the check
 * the dashboard copy had and the admin copy lacked. Deleting a paid bill is
 * shown and explained instead of failing on the server.
 */
const AccountPayableRowActions = ({
  row,
}: {
  row: Row<AccountPayableRow>;
}): JSX.Element => {
  const bill = row.original;

  const [open, setOpen] = useState<"update" | "delete" | null>(null);

  const editPermissions = useCheckMultiplePermissions([
    {
      key: permissions.ACCOUNT_PAYABLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.ACCOUNT_PAYABLE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const deletePermissions = useCheckMultiplePermissions([
    {
      key: permissions.ACCOUNT_PAYABLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.ACCOUNT_PAYABLE_MANAGE),
    },
  ]);

  const copy = (value: string, label: string) => {
    void copyWithFeedback(value, label);
  };

  const deleteBlocked = !deletePermissions.hasAllPermissions
    ? deletePermissions.tooltipMessage
    : isDeletable(bill)
      ? null
      : PAID_REASON;

  return (
    <>
      <RowActions
        entity={`a conta a pagar ${bill.document_number ?? shortId(bill.id)}`}
      >
        <RowActionItem
          label="Editar Conta a Pagar"
          blockedReason={
            editPermissions.hasAllPermissions
              ? null
              : editPermissions.tooltipMessage
          }
          onSelect={() => setOpen("update")}
        />
        <RowActionItem label="Copiar ID" onSelect={() => copy(bill.id, "ID")} />
        {bill.serviceOrderId && (
          <RowActionItem
            label="Copiar ID da ordem de serviço"
            onSelect={() =>
              copy(bill.serviceOrderId as string, "ID da ordem de serviço")
            }
          />
        )}

        <RowActionSeparator />

        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={deleteBlocked}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "update" && (
        <AccountPayableFormDialog
          businessId={bill.businessId}
          bill={bill}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}

      {open === "delete" && (
        <DeleteAccountPayableDialog
          bill={bill}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
};

export { AccountPayableRowActions };
