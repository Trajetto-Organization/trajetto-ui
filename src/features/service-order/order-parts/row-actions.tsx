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

import type { FleetScope } from "../lib/service-order-rules";

import { DeleteOrderPartDialog } from "./delete-dialog";
import { OrderPartFormDialog } from "./form-dialog";
import type { OrderPartRow } from "./lib/order-part-rules";

function copy(value: string | null | undefined, what: string) {
  void copyWithFeedback(value, what);
}

/**
 * The order-part row menu for /admin and /dashboard (decision 3.5): the
 * dashboard copy checked permissions and the admin copy did not; the check
 * is kept (a MASTER holds every permission), with the company id on /admin.
 */
const OrderPartRowActions = ({
  scope,
  line,
}: {
  scope: FleetScope;
  line: OrderPartRow;
}): JSX.Element => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const write = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_PART_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_PART_MANAGE),
    },
    {
      key: permissions.PART_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PART_MANAGE),
    },
  ]);

  const writeBlocked = write.hasAllPermissions ? null : write.tooltipMessage;

  return (
    <>
      <RowActions
        entity={"a peça " + line.part.description + " da ordem de serviço"}
      >
        <RowActionItem
          label="Editar Lançamento"
          blockedReason={writeBlocked}
          onSelect={() => setIsEditing(true)}
        />
        <RowActionItem label="Copiar ID" onSelect={() => copy(line.id, "ID")} />
        {scope === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(line.businessId, "ID da empresa")}
          />
        )}
        <RowActionItem
          label="Copiar ID da ordem"
          onSelect={() => copy(line.serviceOrderId, "ID da ordem de serviço")}
        />
        <RowActionItem
          label="Copiar ID da peça"
          onSelect={() => copy(line.partId, "ID da peça")}
        />
        <RowActionSeparator />
        <RowActionItem
          label="Remover da Ordem"
          destructive
          blockedReason={writeBlocked}
          onSelect={() => setIsDeleting(true)}
        />
      </RowActions>

      {isEditing && (
        <OrderPartFormDialog
          businessId={line.businessId}
          line={line}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isDeleting && (
        <DeleteOrderPartDialog
          line={line}
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
        />
      )}
    </>
  );
};

export { OrderPartRowActions };
