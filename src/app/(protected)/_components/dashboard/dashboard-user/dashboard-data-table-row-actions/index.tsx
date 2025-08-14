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

import { userTableSchema } from "@/schemas/user-table-schema";
import { useDashboardUpdateUserForm } from "./hooks";

import { DashboardUpdateUserForm } from "../dashboard-update-user-form";
import { DashboardDeleteUserForm } from "../dashboard-delete-user-form";

import { DashboardRevokeUserAccessForm } from "../dashboard-revoke-user-access";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { permissions } from "@/lib/permissions";
import { toast } from "sonner";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useAuthStore } from "@/store/auth-store";

interface DashboardDataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableUserRowActions<TData>({
  row,
}: DashboardDataTableRowActionsProps<TData>) {
  const collumnRowAction = userTableSchema.parse(row.original);
  const {
    isUpdateUserOpen,
    handleOpenUpdateUser,
    handleOpenDropdown,
    isDropdownOpen,
  } = useDashboardUpdateUserForm();

  const { role } = useAuthStore();

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
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
  ]);

  // Check if current user is BUSINESS_ADMIN to show revoke access
  const canRevokeAccess = role === "BUSINESS_ADMIN";

  const menuActions = [
    {
      label: "Editar Usuário",
      onClick: handleOpenUpdateUser,
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
    ...(collumnRowAction.profileAccessId !== "N/A"
      ? [
          {
            label: "Copiar ID do perfil",
            onClick: () =>
              handleCopyID(collumnRowAction.profileAccessId as string),
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
            <TooltipProvider delayDuration={100} key={action.label}>
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
          {canRevokeAccess && (
            <DashboardRevokeUserAccessForm
              access_revoked={collumnRowAction.access_revoked}
              userId={collumnRowAction.id}
            />
          )}
          <DashboardDeleteUserForm userId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateUserOpen && (
        <DashboardUpdateUserForm
          userData={collumnRowAction}
          handleOpenUpdateUser={handleOpenUpdateUser}
          isUpdateUser={isUpdateUserOpen}
        />
      )}
    </>
  );
}
