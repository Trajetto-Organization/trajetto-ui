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

import { permissionsTableSchema } from "@/schemas/permissions-table-schema";
import { useDashboardUpdatePermissionForm } from "./hooks";

import { DashboardDeletePermissionForm } from "../dashboard-delete-permission-form";
import { DashboardUpdatePermissionForm } from "../dashboard-update-permission-form";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { permissions } from "@/lib/permissions";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTablePermissionRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = permissionsTableSchema.parse(row.original);
  const {
    isUpdatePermissionOpen,
    handleOpenUpdatePermission,
    handleOpenDropdown,
    isDropdownOpen,
  } = useDashboardUpdatePermissionForm();

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
      key: permissions.USER_PERMISSION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_PERMISSION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
  ]);

  const menuActions = [
    {
      label: "Editar Permissão",
      onClick: handleOpenUpdatePermission,
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
      label: "Copiar ID do perfil",
      onClick: () => handleCopyID(collumnRowAction.profileAccessId),
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
          <DashboardDeletePermissionForm permissionId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdatePermissionOpen && (
        <DashboardUpdatePermissionForm
          permissionData={collumnRowAction}
          handleOpenUpdatePermission={handleOpenUpdatePermission}
          isUpdatePermission={isUpdatePermissionOpen}
        />
      )}
    </>
  );
}
