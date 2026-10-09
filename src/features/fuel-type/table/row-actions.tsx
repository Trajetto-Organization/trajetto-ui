"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { FuelTypeFormDialog } from "../form-dialog";
import { DeleteFuelTypeDialog } from "../delete-dialog";
import type { FuelTypeRow } from "../lib/types";
import { copyWithFeedback } from "@/features/fuel/lib/copy";

const NO_WRITE = "Você não tem permissão para alterar tipos de combustível.";

/**
 * The row menu (decision 3.5). The admin copy offered edit and delete with
 * no permission check and "Copiar ID da empresa" (the company is the one
 * selected at the top now); the dashboard copy disabled edit without saying
 * why. Blocked actions stay visible with the reason.
 */
const FuelTypeRowActions = ({
  row,
}: {
  row: Row<FuelTypeRow>;
}): JSX.Element => {
  const fuelType = row.original;

  const [open, setOpen] = useState<"update" | "delete" | null>(null);
  const canWrite = useHasPermission(permissions.FUEL_TYPE_MANAGE, "write");

  const copyId = () => {
    void copyWithFeedback(fuelType.id, "ID");
  };

  return (
    <>
      <RowActions entity={`o combustível ${fuelType.description}`}>
        <RowActionItem
          label="Editar Combustível"
          blockedReason={canWrite ? null : NO_WRITE}
          onSelect={() => setOpen("update")}
        />
        <RowActionItem label="Copiar ID" onSelect={copyId} />

        <RowActionSeparator />

        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={canWrite ? null : NO_WRITE}
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "update" && (
        <FuelTypeFormDialog
          businessId={fuelType.businessId}
          fuelType={fuelType}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}

      {open === "delete" && (
        <DeleteFuelTypeDialog
          fuelType={fuelType}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
};

export { FuelTypeRowActions };
