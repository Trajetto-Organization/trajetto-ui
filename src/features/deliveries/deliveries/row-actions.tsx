"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import { toast } from "sonner";
import {
  getDelivery,
  type DeliveryDetail,
  type DeliveryListItem,
} from "@/actions/delivery/get-delivery";

import { permissions } from "@/lib/permissions";
import { isStaleActionResult } from "@/lib/action-result";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import {
  DELIVERY_TRANSITIONS,
  NOT_EDITABLE_REASON,
  isDeliveryEditable,
} from "../lib/status";

import { DeliveryDetailDialog } from "./detail-dialog/lazy";
import { DeliveryFormDialog } from "./form-dialog";

import { CancelDeliveryDialog } from "./cancel-dialog";

interface DeliveryRowActionsProps {
  row: Row<DeliveryListItem>;
}

const DeliveryRowActions = ({ row }: DeliveryRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);

  // The table row is a summary; editing needs the address, the document and
  // the notes, so the full record is fetched when the dialog is asked for.
  const [editingDelivery, setEditingDelivery] = useState<DeliveryDetail | null>(
    null,
  );

  const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(false);

  const delivery = row.original;

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  // Cancelling follows the status machine: a delivered or already cancelled
  // delivery has no transitions left, and the menu says so instead of
  // offering an action the API would refuse.
  const canCancel = DELIVERY_TRANSITIONS[delivery.status].includes("CANCELLED");

  const handleCopyID = () => {
    navigator.clipboard
      .writeText(delivery.id)
      .then(() => toast.success("ID copiado para a área de transferência!"))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  const handleOpenEdit = async () => {
    if (!businessId) return;

    setIsLoadingEdit(true);

    try {
      const response = await getDelivery(businessId, delivery.id);

      if (isStaleActionResult(response)) return;

      if (!response.success || !response.data) {
        toast.error(response.message);
        return;
      }

      setEditingDelivery(response.data);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  // The API edits only PENDING and FAILED; "Em rota" used to open the form
  // and fail on save (DLV-EDIT-2). The menu says why, with the API's words.
  const editBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !isDeliveryEditable(delivery.status)
      ? NOT_EDITABLE_REASON
      : null;

  const cancelBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !canCancel
      ? "Esta entrega já está em um estado final e não pode ser cancelada."
      : null;

  return (
    <>
      {/* The standard menu only (decision 3.5): 160px, text items, no
          extra eye button beside it — "Ver detalhes" is the first item. */}
      <RowActions
        entity={`a entrega para ${delivery.recipient_name}`}
        isBusy={isLoadingEdit}
      >
        <RowActionItem
          label="Ver detalhes"
          onSelect={() => setIsDetailOpen(true)}
        />

        <RowActionItem
          label="Editar entrega"
          blockedReason={editBlocker}
          onSelect={() => void handleOpenEdit()}
        />

        <RowActionItem label="Copiar ID" onSelect={handleCopyID} />

        <RowActionSeparator />

        {/* No delete: a delivery is a fiscal record. Cancelling is the
        ending it can have, and it preserves the history (decision 5.1). */}
        <RowActionItem
          label="Cancelar entrega"
          destructive
          blockedReason={cancelBlocker}
          onSelect={() => setIsCancelOpen(true)}
        />
      </RowActions>

      {isDetailOpen && businessId && (
        <DeliveryDetailDialog
          businessId={businessId}
          deliveryId={delivery.id}
          onClose={() => setIsDetailOpen(false)}
        />
      )}

      {editingDelivery && businessId && (
        <DeliveryFormDialog
          businessId={businessId}
          delivery={editingDelivery}
          isOpen={Boolean(editingDelivery)}
          onClose={() => setEditingDelivery(null)}
        />
      )}

      {isCancelOpen && businessId && (
        <CancelDeliveryDialog
          businessId={businessId}
          deliveryId={delivery.id}
          recipientName={delivery.recipient_name}
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
        />
      )}
    </>
  );
};

export { DeliveryRowActions };
