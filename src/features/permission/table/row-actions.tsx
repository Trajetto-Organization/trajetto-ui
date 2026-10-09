"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { AdminScope } from "@/features/user/lib/scope";

import type { PermissionRow } from "../types";

import { PermissionFormDialog } from "../form-dialog";
import { DeletePermissionDialog } from "../delete-dialog";

interface PermissionRowActionsProps {
  permission: PermissionRow;
  scope: AdminScope;
}

/**
 * The row menu in the product's standard (decision 3.5): 160px, text only,
 * the destructive act in red, and what the person may not do shown disabled
 * with the reason. The /admin copy offered every action to anyone and the
 * /dashboard one let anybody open "Deletar".
 */
const PermissionRowActions = ({
  permission,
  scope,
}: PermissionRowActionsProps): JSX.Element => {
  const [open, setOpen] = useState<"edit" | "delete" | null>(null);

  // Editing opens the profile picker, so it needs to read profiles too.
  const editPermission = useCheckMultiplePermissions([
    {
      key: permissions.USER_PERMISSION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_PERMISSION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
  ]);

  const writePermission = useCheckMultiplePermissions([
    {
      key: permissions.USER_PERMISSION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_PERMISSION_MANAGE),
    },
  ]);

  const editBlocked = editPermission.hasAllPermissions
    ? null
    : editPermission.tooltipMessage;
  const deleteBlocked = writePermission.hasAllPermissions
    ? null
    : writePermission.tooltipMessage;

  const copy = (value: string, what: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() =>
        toast.success(`${what} copiado para a área de transferência!`),
      )
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  const close = () => setOpen(null);

  return (
    <>
      <RowActions entity={`a permissão ${permission.action}`}>
        <RowActionItem
          label="Editar Permissão"
          blockedReason={editBlocked}
          onSelect={() => setOpen("edit")}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(permission.id, "ID")}
        />
        <RowActionItem
          label="Copiar ID do perfil"
          onSelect={() => copy(permission.profileAccessId, "ID do perfil")}
        />
        {/* The master supports many companies; the id is what they paste. */}
        {scope === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(permission.businessId, "ID da empresa")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label="Deletar Permissão"
          destructive
          blockedReason={deleteBlocked}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "edit" && (
        <PermissionFormDialog
          businessId={permission.businessId}
          permission={permission}
          isOpen
          onClose={close}
        />
      )}

      {open === "delete" && (
        <DeletePermissionDialog
          permissionId={permission.id}
          name={permission.action}
          profileName={permission.profileAccess.name}
          isOpen
          onClose={close}
        />
      )}
    </>
  );
};

export { PermissionRowActions };
