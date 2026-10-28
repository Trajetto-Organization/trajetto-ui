"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { occurrenceTypeWriteBlocker } from "../lib/occurrence-type-rules";
import { OccurrenceTypeFormDialog } from "./form-dialog";
import { deleteBlockerOf } from "./category-display";

import { DeleteOccurrenceTypeDialog } from "./delete-dialog";

interface OccurrenceTypeRowActionsProps {
  row: Row<OccurrenceTypeData>;
}

const OccurrenceTypeRowActions = ({
  row,
}: OccurrenceTypeRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const occurrenceType = row.original;

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Read here rather than as a prop: the hook subscribes to the auth store,
  // so a permission granted or revoked over the socket reaches this row
  // without the table having to rebuild its columns.
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.OCCURRENCE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.OCCURRENCE_MANAGE),
    },
  ]);

  const handleCopyID = () => {
    void copyWithFeedback(occurrenceType.id, "ID");
  };

  // A permission revoked over the socket disables both at once; the reason
  // stays readable on hover (decision 3.5). The platform's own type is never
  // the company's to change (409 OCCURRENCE_TYPE_SYSTEM).
  const writeBlocker = occurrenceTypeWriteBlocker(
    occurrenceType,
    permissionsRequired.hasAllPermissions
      ? null
      : permissionsRequired.tooltipMessage,
  );

  // Decision 14.3: a seeded default is edited or deactivated, never deleted
  // (409 OCCURRENCE_TYPE_DEFAULT); the menu says so before the dialog.
  const deleteBlocker = writeBlocker ?? deleteBlockerOf(occurrenceType);

  return (
    <>
      {/* The standard row menu (decision 3.5): 160px, text only, the delete
          in red and a blocked action disabled with its reason. */}
      <RowActions entity={`o tipo de ocorrência ${occurrenceType.name}`}>
        <RowActionItem
          label="Editar Tipo"
          blockedReason={writeBlocker}
          onSelect={() => setIsEditOpen(true)}
        />

        <RowActionItem label="Copiar ID" onSelect={handleCopyID} />

        <RowActionSeparator />

        <RowActionItem
          label="Deletar"
          destructive
          blockedReason={deleteBlocker}
          onSelect={() => setIsDeleteOpen(true)}
        />
      </RowActions>

      {isEditOpen && businessId && (
        <OccurrenceTypeFormDialog
          businessId={businessId}
          occurrenceType={occurrenceType}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && businessId && (
        <DeleteOccurrenceTypeDialog
          businessId={businessId}
          occurrenceTypeId={occurrenceType.id}
          occurrenceTypeName={occurrenceType.name}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
};

export { OccurrenceTypeRowActions };
