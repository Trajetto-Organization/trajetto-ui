"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import type { ImportData } from "@/actions/import/list-imports";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

import { ImportReportDialog } from "./report-dialog";
import { ReverseImportDialog } from "./reverse-dialog";

import { canReverse } from "./lib/status";

interface ImportRowActionsProps {
  row: Row<ImportData>;
}

const ImportRowActions = ({ row }: ImportRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const record = row.original;

  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isReverseOpen, setIsReverseOpen] = useState<boolean>(false);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const handleCopyID = () => {
    void copyWithFeedback(record.id, "ID");
  };

  /**
   * Why the undo is refused, in the words the operator needs.
   *
   * An empty string means it is offered. A disabled button with no
   * explanation is the thing this app never does.
   */
  const reverseBlockedReason = !permissionsRequired.hasAllPermissions
    ? permissionsRequired.tooltipMessage
    : record.status === "REVERSED"
      ? "Esta importação já foi estornada."
      : record.status === "IN_PROGRESS"
        ? "A importação ainda está em andamento. Aguarde o fim para estorná-la."
        : !canReverse(record)
          ? "Esta importação não pode ser estornada."
          : null;

  return (
    <>
      {/* The standard menu (decision 3.5): 160px, text items, the undo in
          red and disabled with its reason. */}
      <RowActions entity={`a importação ${record.filename}`}>
        <RowActionItem
          label="Ver relatório"
          onSelect={() => setIsReportOpen(true)}
        />

        <RowActionItem label="Copiar ID" onSelect={handleCopyID} />

        <RowActionSeparator />

        <RowActionItem
          label="Estornar"
          destructive
          blockedReason={reverseBlockedReason}
          onSelect={() => setIsReverseOpen(true)}
        />
      </RowActions>

      {isReportOpen && (
        <ImportReportDialog
          record={record}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {isReverseOpen && businessId && (
        <ReverseImportDialog
          businessId={businessId}
          importId={record.id}
          filename={record.filename}
          imported={record.imported}
          isOpen={isReverseOpen}
          onClose={() => setIsReverseOpen(false)}
        />
      )}
    </>
  );
};

export { ImportRowActions };
