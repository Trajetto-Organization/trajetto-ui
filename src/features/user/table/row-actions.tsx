"use client";

import { useState } from "react";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { useAuthStore } from "@/store/auth-store";

import type { AdminScope } from "../lib/scope";
import { revokeBlockedReason } from "../lib/user-rules";
import type { UserRow } from "../types";

import { UserFormDialog } from "../form-dialog";
import { DeleteUserDialog } from "../delete-dialog";
import { RevokeAccessDialog } from "../revoke-dialog";

interface UserRowActionsProps {
  user: UserRow;
  scope: AdminScope;
}

/**
 * The row menu in the product's standard (decision 3.5): 160px, text only,
 * the destructive act in red, and what the person may not do shown disabled
 * with the reason. The /admin copy offered every action to anyone; the
 * /dashboard copy hid revoking from users instead of saying why.
 */
const UserRowActions = ({ user, scope }: UserRowActionsProps): JSX.Element => {
  const [open, setOpen] = useState<"edit" | "delete" | "revoke" | null>(null);
  const actorRole = useAuthStore((state) => state.role);

  // Editing needs the pickers the dialog opens: profiles and drivers.
  const editPermission = useCheckMultiplePermissions([
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const writePermission = useCheckMultiplePermissions([
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const editBlocked = editPermission.hasAllPermissions
    ? null
    : editPermission.tooltipMessage;
  const writeBlocked = writePermission.hasAllPermissions
    ? null
    : writePermission.tooltipMessage;
  const revokeBlocked = revokeBlockedReason(actorRole);

  const copy = (value: string, what: string) => {
    void copyWithFeedback(value, what);
  };

  const close = () => setOpen(null);

  return (
    <>
      <RowActions entity={`o usuário ${user.name}`}>
        <RowActionItem
          label="Editar Usuário"
          blockedReason={editBlocked}
          onSelect={() => setOpen("edit")}
        />
        <RowActionItem label="Copiar ID" onSelect={() => copy(user.id, "ID")} />
        {user.profileAccessId && (
          <RowActionItem
            label="Copiar ID do perfil"
            onSelect={() =>
              copy(user.profileAccessId as string, "ID do perfil")
            }
          />
        )}
        {user.driverId && (
          <RowActionItem
            label="Copiar ID do motorista"
            onSelect={() => copy(user.driverId as string, "ID do motorista")}
          />
        )}
        {/* The master supports many companies; the id is what they paste. */}
        {scope === "admin" && user.businessId && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(user.businessId as string, "ID da empresa")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label={user.access_revoked ? "Restaurar Acesso" : "Revogar Acesso"}
          blockedReason={revokeBlocked}
          onSelect={() => setOpen("revoke")}
        />
        <RowActionItem
          label="Deletar Usuário"
          destructive
          blockedReason={writeBlocked}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {/* The row's company is the page's: the list is one company's. */}
      {open === "edit" && user.businessId && (
        <UserFormDialog
          businessId={user.businessId}
          user={user}
          isOpen
          onClose={close}
        />
      )}

      {open === "revoke" && (
        <RevokeAccessDialog
          userId={user.id}
          name={user.name}
          accessRevoked={user.access_revoked}
          isOpen
          onClose={close}
        />
      )}

      {open === "delete" && (
        <DeleteUserDialog
          userId={user.id}
          name={user.name}
          isOpen
          onClose={close}
        />
      )}
    </>
  );
};

export { UserRowActions };
