"use client";

import { useState } from "react";

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { DriverScope } from "../lib/driver-rules";
import type { DriverRow } from "../types";

import { DriverFormDialog } from "../form-dialog";
import { DeleteDriverDialog } from "../delete-dialog";

interface DriverRowActionsProps {
  driver: DriverRow;
  mode: DriverScope;
}

/**
 * The row menu in the product's standard (decision 3.5): 160px, text only,
 * the destructive act in red, and what the person may not do shown disabled
 * with the reason — the /admin copy offered editing and deleting to anyone.
 */
const DriverRowActions = ({
  driver,
  mode,
}: DriverRowActionsProps): JSX.Element => {
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Read here: a permission granted or revoked over the socket reaches the
  // row without the table rebuilding its columns.
  const writePermission = useCheckMultiplePermissions([
    {
      key: permissions.DRIVER_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const blockedReason = writePermission.hasAllPermissions
    ? null
    : writePermission.tooltipMessage;

  const copy = (value: string, what: string) => {
    void copyWithFeedback(value, what);
  };

  return (
    <>
      <RowActions entity={`o motorista ${driver.name}`}>
        <RowActionItem
          label="Editar Motorista"
          blockedReason={blockedReason}
          onSelect={() => setIsEditOpen(true)}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(driver.id, "ID")}
        />
        {driver.branchId && (
          <RowActionItem
            label="Copiar ID da filial"
            onSelect={() => copy(driver.branchId as string, "ID da filial")}
          />
        )}
        {/* The master supports many companies; the id is what they paste. */}
        {mode === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(driver.businessId, "ID da empresa")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label="Deletar Motorista"
          destructive
          blockedReason={blockedReason}
          onSelect={() => setIsDeleteOpen(true)}
        />
      </RowActions>

      {isEditOpen && (
        <DriverFormDialog
          businessId={driver.businessId}
          driver={driver}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <DeleteDriverDialog
          businessId={driver.businessId}
          driverId={driver.id}
          name={driver.name}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
};

export { DriverRowActions };
