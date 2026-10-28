"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

import { StatusChangeReasonFormDialog } from "./form-dialog";
import { DeleteStatusChangeReasonDialog } from "./delete-dialog";

interface StatusChangeReasonRowActionsProps {
  row: Row<StatusChangeReasonData>;
}

const StatusChangeReasonRowActions = ({
  row,
}: StatusChangeReasonRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const reason = row.original;

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Read here rather than as a prop: the hook subscribes to the auth store,
  // so a permission granted or revoked over the socket reaches this row
  // without the table having to rebuild its columns.
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const handleCopyID = () => {
    void copyWithFeedback(reason.id, "ID");
  };

  // A permission revoked over the socket disables both at once; the reason
  // stays readable on hover (decision 3.5).
  const writeBlocker = permissionsRequired.hasAllPermissions
    ? null
    : permissionsRequired.tooltipMessage;

  return (
    <>
      {/* The standard row menu (decision 3.5): 160px, text only, the delete
          in red and a blocked action disabled with its reason. */}
      <RowActions entity={`o motivo ${reason.name}`}>
        <RowActionItem
          label="Editar Motivo"
          blockedReason={writeBlocker}
          onSelect={() => setIsEditOpen(true)}
        />

        <RowActionItem label="Copiar ID" onSelect={handleCopyID} />

        <RowActionSeparator />

        <RowActionItem
          label="Deletar"
          destructive
          blockedReason={writeBlocker}
          onSelect={() => setIsDeleteOpen(true)}
        />
      </RowActions>

      {isEditOpen && businessId && (
        <StatusChangeReasonFormDialog
          businessId={businessId}
          reason={reason}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && businessId && (
        <DeleteStatusChangeReasonDialog
          businessId={businessId}
          reasonId={reason.id}
          reasonName={reason.name}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
};

export { StatusChangeReasonRowActions };
