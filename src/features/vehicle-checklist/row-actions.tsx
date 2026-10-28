"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { ChecklistDetailsDialog } from "@/app/(protected)/_components/shared/checklist-details-dialog";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { formatPickedDay } from "@/features/vehicle/lib/presentation";

import type { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";

import { UpdateVehicleChecklistForm } from "./update-form";
import { DeleteVehicleChecklistDialog } from "./delete-form";

interface VehicleChecklistRowActionsProps {
  row: Row<vehicleChecklistTableSchema>;
}

/**
 * The checklist row menu, the same on /admin and /dashboard (decision 8.7):
 * 160px, text only, "Ver detalhes" as an item (decision 3.5), blocked
 * actions disabled with the reason.
 */
const VehicleChecklistRowActions = ({
  row,
}: VehicleChecklistRowActionsProps): JSX.Element => {
  const checklist = row.original;

  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  const editPermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_CHECKLIST_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_CHECKLIST_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const deletePermissions = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_CHECKLIST_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_CHECKLIST_MANAGE),
    },
  ]);

  const copy = (value: string | null | undefined, label: string) => {
    void copyWithFeedback(value, label);
  };

  const plate = checklist.vehicle?.license_plate ?? "sem placa";
  const label = `${plate} de ${formatPickedDay(checklist.checklist_date)}`;

  return (
    <>
      <RowActions entity={`o checklist ${label}`}>
        <RowActionItem
          label="Ver detalhes"
          onSelect={() => setIsDetailsOpen(true)}
        />
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
          onSelect={() => copy(checklist.id, "ID do checklist")}
        />
        <RowActionItem
          label="Copiar ID do veículo"
          onSelect={() => copy(checklist.vehicleId, "ID do veículo")}
        />
        <RowActionItem
          label="Copiar ID do motorista"
          onSelect={() => copy(checklist.driverId, "ID do motorista")}
        />
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

      {isDetailsOpen && (
        <ChecklistDetailsDialog
          checklistData={checklist}
          isOpen={isDetailsOpen}
          onOpenChange={() => setIsDetailsOpen(false)}
        />
      )}

      {isEditOpen && (
        <UpdateVehicleChecklistForm
          checklistData={checklist}
          handleCloseUpdateChecklist={() => setIsEditOpen(false)}
          isUpdateChecklistOpen={isEditOpen}
        />
      )}

      {isDeleteOpen && (
        <DeleteVehicleChecklistDialog
          businessId={checklist.businessId}
          checklistId={checklist.id}
          label={label}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      )}
    </>
  );
};

export { VehicleChecklistRowActions };
