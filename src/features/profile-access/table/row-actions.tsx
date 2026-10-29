"use client";

import { useState } from "react";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";
import { BulkConfigurePermissionsDialog } from "@/app/(protected)/_components/shared/bulk-configure-permissions-dialog";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { AdminScope } from "@/features/user/lib/scope";

import { deleteProfileBlockedReason } from "../lib/profile-access-rules";
import type { ProfileAccessRow } from "../types";

import { ProfileAccessFormDialog } from "../form-dialog";
import { DeleteProfileAccessDialog } from "../delete-dialog";

interface ProfileAccessRowActionsProps {
  profile: ProfileAccessRow;
  scope: AdminScope;
}

/**
 * The row menu in the product's standard (decision 3.5): 160px, text only,
 * the destructive act in red, and what the person may not do shown disabled
 * with the reason. The /admin copy checked no permission at all; deleting a
 * profile still in use is now blocked up front with the count.
 */
const ProfileAccessRowActions = ({
  profile,
  scope,
}: ProfileAccessRowActionsProps): JSX.Element => {
  const [open, setOpen] = useState<"configure" | "edit" | "delete" | null>(
    null,
  );

  const profileWrite = useCheckMultiplePermissions([
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "write",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
  ]);

  const permissionWrite = useCheckMultiplePermissions([
    {
      key: permissions.USER_PERMISSION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_PERMISSION_MANAGE),
    },
  ]);

  const editBlocked = profileWrite.hasAllPermissions
    ? null
    : profileWrite.tooltipMessage;
  const configureBlocked = permissionWrite.hasAllPermissions
    ? null
    : permissionWrite.tooltipMessage;
  const deleteBlocked = deleteProfileBlockedReason(
    profile.usersCount,
    editBlocked,
  );

  const copy = (value: string, what: string) => {
    void copyWithFeedback(value, what);
  };

  const close = () => setOpen(null);

  return (
    <>
      <RowActions entity={`o perfil ${profile.name}`}>
        <RowActionItem
          label="Configurar Permissões"
          blockedReason={configureBlocked}
          onSelect={() => setOpen("configure")}
        />
        <RowActionItem
          label="Editar Perfil"
          blockedReason={editBlocked}
          onSelect={() => setOpen("edit")}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(profile.id, "ID")}
        />
        {/* The master supports many companies; the id is what they paste. */}
        {scope === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(profile.businessId, "ID da empresa")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label="Deletar Perfil"
          destructive
          blockedReason={deleteBlocked}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "configure" && (
        <BulkConfigurePermissionsDialog
          profileAccessId={profile.id}
          businessId={profile.businessId}
          profileName={profile.name}
          isOpen
          onClose={close}
        />
      )}

      {open === "edit" && (
        <ProfileAccessFormDialog
          businessId={profile.businessId}
          profile={profile}
          isOpen
          onClose={close}
        />
      )}

      {open === "delete" && (
        <DeleteProfileAccessDialog
          profileAccessId={profile.id}
          name={profile.name}
          isOpen
          onClose={close}
        />
      )}
    </>
  );
};

export { ProfileAccessRowActions };
