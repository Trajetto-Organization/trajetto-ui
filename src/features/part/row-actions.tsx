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

import type { FleetScope } from "@/features/service-order/lib/service-order-rules";

import { DeletePartDialog } from "./delete-dialog";
import { PartFormDialog } from "./form-dialog";
import { partDeleteBlockedReason, type PartRow } from "./lib/part-rules";

function copy(value: string | null | undefined, what: string) {
  void copyWithFeedback(value, what);
}

/**
 * The part row menu for /admin and /dashboard (decision 3.5). The dashboard
 * copy checked the permission; the admin copy offered the company id. Both
 * kept.
 */
const PartRowActions = ({
  scope,
  part,
}: {
  scope: FleetScope;
  part: PartRow;
}): JSX.Element => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const write = useCheckMultiplePermissions([
    {
      key: permissions.PART_MANAGE,
      action: "write",
      label: getPermissionName(permissions.PART_MANAGE),
    },
  ]);

  const writeBlocked = write.hasAllPermissions ? null : write.tooltipMessage;

  return (
    <>
      <RowActions entity={`a peça ${part.description}`}>
        <RowActionItem
          label="Editar Peça"
          blockedReason={writeBlocked}
          onSelect={() => setIsEditing(true)}
        />
        <RowActionItem label="Copiar ID" onSelect={() => copy(part.id, "ID")} />
        {scope === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(part.businessId, "ID da empresa")}
          />
        )}
        {part.supplierId && (
          <RowActionItem
            label="Copiar ID do fornecedor"
            onSelect={() => copy(part.supplierId, "ID do fornecedor")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label="Excluir Peça"
          destructive
          blockedReason={writeBlocked ?? partDeleteBlockedReason(part)}
          onSelect={() => setIsDeleting(true)}
        />
      </RowActions>

      {isEditing && (
        <PartFormDialog
          businessId={part.businessId}
          part={part}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isDeleting && (
        <DeletePartDialog
          part={part}
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
        />
      )}
    </>
  );
};

export { PartRowActions };
