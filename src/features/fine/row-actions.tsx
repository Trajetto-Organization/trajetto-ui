"use client";

import { useState } from "react";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { useAuthStore } from "@/store/auth-store";

import { FineFormDialog } from "./form-dialog";
import { DeleteFineDialog } from "./delete-dialog";

import type { FineRow } from "./lib/types";

interface FineRowActionsProps {
  fine: FineRow;
}

/**
 * The row menu of a fine, the product's standard (decision 3.5): 160px,
 * text only, the destructive act in red, and an action the person may not
 * use shown disabled with the reason. The /admin copy had no permission
 * check at all and the /dashboard one disabled "Editar" but left "Deletar"
 * looking usable behind a disabled trigger.
 */
const FineRowActions = ({ fine }: FineRowActionsProps): JSX.Element => {
  const role = useAuthStore((state) => state.role);

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Editing goes through the branch, vehicle and driver pickers.
  const canEdit = useCheckMultiplePermissions([
    {
      key: permissions.FINE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FINE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const canDelete = useCheckMultiplePermissions([
    {
      key: permissions.FINE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FINE_MANAGE),
    },
  ]);

  const copy = (value: string, label: string) => {
    void copyWithFeedback(value, label);
  };

  const code = `${fine.trafficViolationCode.code}-${fine.trafficViolationCode.sub_code}`;

  return (
    <>
      <RowActions
        entity={`a multa ${code} do veículo ${fine.vehicle.license_plate}`}
      >
        <RowActionItem
          label="Editar Multa"
          blockedReason={
            canEdit.hasAllPermissions ? null : canEdit.tooltipMessage
          }
          onSelect={() => setIsEditOpen(true)}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(fine.id, "ID da multa")}
        />
        {role === "MASTER" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(fine.businessId, "ID da empresa")}
          />
        )}
        <RowActionItem
          label="Copiar ID da filial"
          onSelect={() => copy(fine.branchId, "ID da filial")}
        />
        <RowActionItem
          label="Copiar ID do motorista"
          onSelect={() => copy(fine.driverId, "ID do motorista")}
        />
        <RowActionItem
          label="Copiar ID do veículo"
          onSelect={() => copy(fine.vehicleId, "ID do veículo")}
        />
        <RowActionItem
          label="Copiar código da infração"
          onSelect={() => copy(code, "Código da infração")}
        />
        <RowActionSeparator />
        <RowActionItem
          label="Deletar"
          destructive
          blockedReason={
            canDelete.hasAllPermissions ? null : canDelete.tooltipMessage
          }
          onSelect={() => setIsDeleteOpen(true)}
        />
      </RowActions>

      {isEditOpen && (
        <FineFormDialog
          businessId={fine.businessId}
          fine={fine}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <DeleteFineDialog
          fine={fine}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
};

export { FineRowActions };
