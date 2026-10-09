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

import type { VehicleRow } from "./types";
import { VehicleFormDialog } from "./form-dialog";
import { VehicleDeleteDialog } from "./delete-dialog";

interface VehicleRowActionsProps {
  row: Row<VehicleRow>;
  /** The company on screen (the /admin selector's or the session's). */
  businessId: string;
}

/**
 * The row menu (decision 3.5): 160px, text only, the destructive act in red,
 * an action the person may not use disabled WITH the reason.
 */
const VehicleRowActions = ({
  row,
  businessId,
}: VehicleRowActionsProps): JSX.Element => {
  const vehicle = row.original;

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  const editPermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);

  const deletePermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
  ]);

  const copy = (value: string, label: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() =>
        toast.success(`${label} copiado para a área de transferência!`),
      )
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  return (
    <>
      <RowActions entity={`o veículo ${vehicle.license_plate}`}>
        <RowActionItem
          label="Editar"
          blockedReason={
            editPermissions.hasAllPermissions
              ? null
              : editPermissions.tooltipMessage
          }
          onSelect={() => setIsEditOpen(true)}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(vehicle.id, "ID do veículo")}
        />
        <RowActionItem
          label="Copiar placa"
          onSelect={() => copy(vehicle.license_plate, "Placa")}
        />
        {vehicle.driverId && (
          <RowActionItem
            label="Copiar ID do motorista"
            onSelect={() => copy(vehicle.driverId as string, "ID do motorista")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={
            deletePermissions.hasAllPermissions
              ? null
              : deletePermissions.tooltipMessage
          }
          onSelect={() => setIsDeleteOpen(true)}
        />
      </RowActions>

      {isEditOpen && (
        <VehicleFormDialog
          businessId={businessId}
          vehicle={vehicle}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      {isDeleteOpen && (
        <VehicleDeleteDialog
          businessId={businessId}
          vehicle={vehicle}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      )}
    </>
  );
};

export { VehicleRowActions };
