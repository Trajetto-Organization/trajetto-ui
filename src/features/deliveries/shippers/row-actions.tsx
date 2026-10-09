"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import { toast } from "sonner";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import type { ShipperData } from "@/actions/shipper/list-shipper";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { ShipperFormDialog } from "./form-dialog";

import { DeleteShipperDialog } from "./delete-dialog";

interface ShipperRowActionsProps {
  row: Row<ShipperData>;
}

const ShipperRowActions = ({ row }: ShipperRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const shipper = row.original;

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
    navigator.clipboard
      .writeText(shipper.id)
      .then(() => toast.success("ID copiado para a área de transferência!"))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
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
      <RowActions entity={`o embarcador ${shipper.name}`}>
        <RowActionItem
          label="Editar Embarcador"
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
        <ShipperFormDialog
          businessId={businessId}
          shipper={shipper}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && businessId && (
        <DeleteShipperDialog
          businessId={businessId}
          shipperId={shipper.id}
          shipperName={shipper.name}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
};

export { ShipperRowActions };
