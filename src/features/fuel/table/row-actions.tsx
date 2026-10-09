"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";

import { FuelDetailsDialog } from "@/app/(protected)/_components/shared/fuel-details-dialog";
import type { FuelProps } from "@/app/(protected)/_components/shared/common.types";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";
import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

import { useFuelWritePermissions } from "../hooks/use-fuel-permissions";
import { copyWithFeedback } from "../lib/copy";
import { UpdateFuelDialog } from "../update-dialog";
import { DeleteFuelDialog } from "../delete-dialog";

/**
 * The row menu (decision 3.5): 160px, text only, the destructive act in red,
 * a blocked action disabled WITH the reason. The dashboard copy checked
 * permissions and the admin copy did not; the admin one showed an eye icon
 * next to "Ver Detalhes". One menu for both now.
 */
const FuelRowActions = ({ row }: { row: Row<FuelProps> }): JSX.Element => {
  const fuel = row.original;

  const [open, setOpen] = useState<"details" | "update" | "delete" | null>(
    null,
  );

  const editPermissions = useFuelWritePermissions();
  const canDelete = useHasPermission(permissions.FUEL_MANAGE, "write");

  const copy = (value: string, what: string) => {
    void copyWithFeedback(value, what);
  };

  // The menu's accessible name reads the day the refueling means, like the
  // table cell (a picked day, not an instant in the browser's zone).
  const label = `${fuel.vehicle?.license_plate ?? "veículo"} em ${formatPickedDay(
    fuel.refueling_date,
  )}`;

  return (
    <>
      <RowActions entity={`o abastecimento ${label}`}>
        <RowActionItem
          label="Ver Detalhes"
          onSelect={() => setOpen("details")}
        />
        <RowActionItem
          label="Editar Abastecimento"
          blockedReason={
            editPermissions.hasAllPermissions
              ? null
              : editPermissions.tooltipMessage
          }
          onSelect={() => setOpen("update")}
        />

        <RowActionSeparator />

        <RowActionItem label="Copiar ID" onSelect={() => copy(fuel.id, "ID")} />
        <RowActionItem
          label="Copiar ID da filial"
          onSelect={() => copy(fuel.branchId, "ID da filial")}
        />
        <RowActionItem
          label="Copiar ID do veículo"
          onSelect={() => copy(fuel.vehicleId, "ID do veículo")}
        />
        <RowActionItem
          label="Copiar ID do motorista"
          onSelect={() => copy(fuel.driverId, "ID do motorista")}
        />
        <RowActionItem
          label="Copiar ID do combustível"
          onSelect={() => copy(fuel.fuelTypeId, "ID do combustível")}
        />

        <RowActionSeparator />

        <RowActionItem
          label="Excluir"
          destructive
          blockedReason={
            canDelete
              ? null
              : "Você não tem permissão para excluir abastecimentos."
          }
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "details" && (
        <FuelDetailsDialog
          fuelData={fuel}
          isOpen
          onOpenChange={() => setOpen(null)}
        />
      )}

      {open === "update" && (
        <UpdateFuelDialog fuel={fuel} isOpen onClose={() => setOpen(null)} />
      )}

      {open === "delete" && (
        <DeleteFuelDialog
          businessId={fuel.businessId}
          fuelId={fuel.id}
          label={label}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
};

export { FuelRowActions };
