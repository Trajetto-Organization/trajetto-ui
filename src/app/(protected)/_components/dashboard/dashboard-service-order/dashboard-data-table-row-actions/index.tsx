"use client";

import { Row } from "@tanstack/react-table";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { serviceOrderTableSchema } from "@/schemas/service-order-table-schema";

import { useDashboardUpdateServiceOrderForm } from "./hooks";
import { DashboardDeleteServiceOrderForm } from "../dashboard-delete-service-order-form";

import { toast } from "sonner";
import { permissions } from "@/lib/permissions";

import { DashboardUpdateServiceOrderForm } from "../dashboard-update-service-order-form";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableServiceOrderRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = serviceOrderTableSchema.parse(row.original);
  const {
    handleCloseUpdateServiceOrder,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateServiceOrderOpen,
  } = useDashboardUpdateServiceOrderForm();

  const handleCopyID = (collumn: string) => {
    navigator.clipboard
      .writeText(collumn)
      .then(() => {
        toast.success("ID copiado para a área de transferência!");
      })
      .catch((err) => {
        toast.error("Erro ao copiar o ID: " + err);
      });
  };

  const permissionsRequired = useCheckMultiplePermissions([
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

  const menuActions = [
    {
      label: "Editar Ordem de Serviço",
      onClick: handleCloseUpdateServiceOrder,
      disabled: !permissionsRequired.hasAllPermissions,
      tooltip: !permissionsRequired.hasAllPermissions
        ? permissionsRequired.tooltipMessage
        : "",
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da filial",
      onClick: () => handleCopyID(collumnRowAction.branchId as string),
    },
    {
      label: "Copiar ID do veículo",
      onClick: () => handleCopyID(collumnRowAction.vehicleId as string),
    },
    {
      label: "Copiar ID do usuário responsável",
      onClick: () => handleCopyID(collumnRowAction.responsibleUserId as string),
    },
    ...(collumnRowAction.supplierId
      ? [
          {
            label: "Copiar ID do fornecedor",
            onClick: () => handleCopyID(collumnRowAction.supplierId as string),
          },
        ]
      : []),
  ];

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenDropdown}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal />
            <span className="sr-only">Abrir Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          {menuActions.map((action) => (
            <TooltipProvider key={action.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      className="cursor-pointer 
                      truncate block"
                      onClick={action.onClick}
                      disabled={action.disabled}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {action.disabled && action.tooltip && (
                  <TooltipContent className="max-w-sm">
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
          <DropdownMenuSeparator />
          <DashboardDeleteServiceOrderForm
            serviceOrderId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateServiceOrderOpen && (
        <DashboardUpdateServiceOrderForm
          serviceOrderData={collumnRowAction}
          handleCloseUpdateServiceOrder={handleCloseUpdateServiceOrder}
          isUpdateServiceOrderOpen={isUpdateServiceOrderOpen}
        />
      )}
    </>
  );
}
