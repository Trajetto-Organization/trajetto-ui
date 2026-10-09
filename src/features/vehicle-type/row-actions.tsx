"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { toast } from "sonner";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { VehicleTypeRow } from "./types";
import { VehicleTypeFormDialog } from "./form-dialog";
import { VehicleTypeDeleteDialog } from "./delete-dialog";

interface VehicleTypeRowActionsProps {
  row: Row<VehicleTypeRow>;
  businessId: string;
}

/** The row menu (decision 3.5): text only, blocked actions say why. */
const VehicleTypeRowActions = ({
  row,
  businessId,
}: VehicleTypeRowActionsProps): JSX.Element => {
  const vehicleType = row.original;

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  const writePermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_TYPE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_TYPE_MANAGE),
    },
  ]);

  const blocked = writePermissions.hasAllPermissions
    ? null
    : writePermissions.tooltipMessage;

  const vehicles = vehicleType._count?.vehicles ?? 0;

  return (
    <>
      <RowActions entity={`o tipo ${vehicleType.description}`}>
        <RowActionItem
          label="Editar"
          blockedReason={blocked}
          onSelect={() => setIsEditOpen(true)}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() =>
            navigator.clipboard
              .writeText(vehicleType.id)
              .then(() =>
                toast.success("ID copiado para a área de transferência!"),
              )
              .catch((error) => toast.error("Erro ao copiar o ID: " + error))
          }
        />
        <RowActionSeparator />
        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={
            blocked ??
            (vehicles > 0
              ? `${vehicles} veículo(s) usam este tipo; troque o tipo deles antes de excluir.`
              : null)
          }
          onSelect={() => setIsDeleteOpen(true)}
        />
      </RowActions>

      {isEditOpen && (
        <VehicleTypeFormDialog
          businessId={businessId}
          vehicleType={vehicleType}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      {isDeleteOpen && (
        <VehicleTypeDeleteDialog
          businessId={businessId}
          vehicleType={vehicleType}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      )}
    </>
  );
};

export { VehicleTypeRowActions };
