"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import { Ban, Copy, Eye, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

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
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { DELIVERY_TRANSITIONS } from "../lib/status";

import { DeliveryDetailDialog } from "./detail-dialog";
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

      if (!response.success || !response.data) {
        toast.error(response.message);
        return;
      }

      setEditingDelivery(response.data);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const isFinalState = DELIVERY_TRANSITIONS[delivery.status].length === 0;

  const editBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : isFinalState
      ? "Entregas concluídas ou canceladas não podem ser editadas."
      : null;

  const cancelBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !canCancel
      ? "Esta entrega já está em um estado final e não pode ser cancelada."
      : null;

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Ver detalhes da entrega para ${delivery.recipient_name}`}
          onClick={() => setIsDetailOpen(true)}
        >
          <Eye className="h-4 w-4" />
        </Button>

        <RowActions
          entity={`a entrega para ${delivery.recipient_name}`}
          isBusy={isLoadingEdit}
        >
          <RowActionItem
            label="Ver detalhes"
            icon={<Eye />}
            onSelect={() => setIsDetailOpen(true)}
          />

          <RowActionItem
            label="Editar entrega"
            icon={<PencilLine />}
            blockedReason={editBlocker}
            onSelect={() => void handleOpenEdit()}
          />

          <RowActionItem
            label="Copiar ID"
            icon={<Copy />}
            onSelect={handleCopyID}
          />

          <RowActionSeparator />

          {/* No delete: a delivery is a fiscal record. Cancelling is the
          ending it can have, and it preserves the history. */}
          <RowActionItem
            label="Cancelar entrega"
            icon={<Ban />}
            destructive
            blockedReason={cancelBlocker}
            onSelect={() => setIsCancelOpen(true)}
          />
        </RowActions>
      </div>

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
