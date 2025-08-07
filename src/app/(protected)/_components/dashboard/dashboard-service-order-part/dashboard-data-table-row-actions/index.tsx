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
import { serviceOrderPartTableSchema } from "@/schemas/service-order-part-table-schema";

import { useDashboardUpdateServiceOrderPartForm } from "./hooks";
import { DashboardDeleteServiceOrderPartForm } from "../dashboard-delete-service-order-part-form";

import { DashboardUpdateServiceOrderPartForm } from "../dashboard-update-service-order-part-form";
import { toast } from "sonner";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { permissions } from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableServiceOrderPartRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = serviceOrderPartTableSchema.parse(row.original);
  const {
    handleCloseUpdateServiceOrderPart,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateServiceOrderPartOpen,
  } = useDashboardUpdateServiceOrderPartForm();

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
      key: permissions.SERVICE_ORDER_PART_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_PART_MANAGE),
    },
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
    },
    {
      key: permissions.PART_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PART_MANAGE),
    },
  ]);

  const menuActions = [
    {
      label: "Editar Ordem de Serviço da Peça",
      onClick: handleCloseUpdateServiceOrderPart,
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
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId),
    },
    {
      label: "Copiar ID da ordem de serviço",
      onClick: () => handleCopyID(collumnRowAction.serviceOrderId),
    },
    {
      label: "Copiar ID da peça",
      onClick: () => handleCopyID(collumnRowAction.partId),
    },
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
          <DashboardDeleteServiceOrderPartForm
            serviceOrderPartId={collumnRowAction.id}
            serviceOrderId={collumnRowAction.serviceOrderId}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateServiceOrderPartOpen && (
        <DashboardUpdateServiceOrderPartForm
          serviceOrderPartData={collumnRowAction}
          handleCloseUpdateServiceOrderPart={handleCloseUpdateServiceOrderPart}
          isUpdateServiceOrderPartOpen={isUpdateServiceOrderPartOpen}
        />
      )}
    </>
  );
}
