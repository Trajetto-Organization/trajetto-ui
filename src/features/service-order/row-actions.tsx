"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

import { DeleteServiceOrderDialog } from "./delete-dialog";
import { UpdateServiceOrderDialog } from "./update-form";
import {
  deleteBlockedReason,
  type FleetScope,
} from "./lib/service-order-rules";
import type { ServiceOrderRow } from "./server-table";

interface ServiceOrderRowActionsProps {
  scope: FleetScope;
  serviceOrder: ServiceOrderRow;
}

function copy(value: string | null | undefined, what: string) {
  void copyWithFeedback(value, what);
}

/**
 * The row menu of the service order list, one for /admin and /dashboard
 * (decision 3.5): 160px, text only, delete in red, and an action the person
 * may not use disabled with the reason. The dashboard copy checked the
 * permissions and the admin copy did not; the admin copy had "Copiar ID da
 * empresa". Both kept: the check (a MASTER holds every permission) and the
 * company id where a master works across companies.
 */
const ServiceOrderRowActions = ({
  scope,
  serviceOrder,
}: ServiceOrderRowActionsProps): JSX.Element => {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const editRequired = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
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
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const deleteRequired = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
    },
  ]);

  // The part lines are a screen of their own key (decision 4.2): a profile
  // without it would land on a refusal, so the item says why instead.
  const partsRead = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_PART_MANAGE,
      action: "read",
      label: getPermissionName(permissions.SERVICE_ORDER_PART_MANAGE),
    },
  ]);

  const partsHref =
    scope === "admin"
      ? `/admin/service-order-part?businessId=${serviceOrder.businessId}&serviceOrderId=${serviceOrder.id}`
      : `/dashboard/service-order-part?serviceOrderId=${serviceOrder.id}`;

  const entity = serviceOrder.vehicle?.license_plate
    ? `a ordem de serviço do veículo ${serviceOrder.vehicle.license_plate}`
    : "a ordem de serviço";

  return (
    <>
      <RowActions entity={entity}>
        <RowActionItem
          label="Editar Ordem de Serviço"
          blockedReason={
            editRequired.hasAllPermissions ? null : editRequired.tooltipMessage
          }
          onSelect={() => setIsEditing(true)}
        />
        <RowActionItem
          label="Ver Peças da Ordem"
          blockedReason={
            partsRead.hasAllPermissions ? null : partsRead.tooltipMessage
          }
          onSelect={() => router.push(partsHref)}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(serviceOrder.id, "ID")}
        />
        {scope === "admin" && (
          <RowActionItem
            label="Copiar ID da empresa"
            onSelect={() => copy(serviceOrder.businessId, "ID da empresa")}
          />
        )}
        <RowActionItem
          label="Copiar ID da filial"
          onSelect={() => copy(serviceOrder.branchId, "ID da filial")}
        />
        <RowActionItem
          label="Copiar ID do veículo"
          onSelect={() => copy(serviceOrder.vehicleId, "ID do veículo")}
        />
        <RowActionItem
          label="Copiar ID do responsável"
          onSelect={() =>
            copy(serviceOrder.responsibleUserId, "ID do responsável")
          }
        />
        {serviceOrder.supplierId && (
          <RowActionItem
            label="Copiar ID do fornecedor"
            onSelect={() => copy(serviceOrder.supplierId, "ID do fornecedor")}
          />
        )}
        <RowActionSeparator />
        <RowActionItem
          label="Excluir Ordem de Serviço"
          destructive
          blockedReason={
            deleteRequired.hasAllPermissions
              ? deleteBlockedReason(serviceOrder)
              : deleteRequired.tooltipMessage
          }
          onSelect={() => setIsDeleting(true)}
        />
      </RowActions>

      {isEditing && (
        <UpdateServiceOrderDialog
          scope={scope}
          serviceOrder={serviceOrder}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isDeleting && (
        <DeleteServiceOrderDialog
          serviceOrder={serviceOrder}
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
        />
      )}
    </>
  );
};

export { ServiceOrderRowActions };
