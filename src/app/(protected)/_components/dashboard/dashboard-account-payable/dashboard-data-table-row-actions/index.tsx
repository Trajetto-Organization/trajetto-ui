"use client";

import { Row } from "@tanstack/react-table";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { accountPayableTableSchema } from "@/schemas/account-payable-table-schema";
import { DashboardDeleteAccountPayableForm } from "../dashboard-delete-account-payable-form";

import { useDashboardUpdateAccountPayableForm } from "./hooks";
import { toast } from "sonner";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { permissions } from "@/lib/permissions";
import { DashboardUpdateAccountPayableForm } from "../dashboard-update-account-payable-form";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableAccountPayableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = accountPayableTableSchema.parse(row.original);
  const {
    isDashboardUpdateAccountPayableOpen,
    handleCloseDashboardUpdateAccountPayable,
    handleOpenDropdown,
    isDropdownOpen,
  } = useDashboardUpdateAccountPayableForm();

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
      key: permissions.ACCOUNT_PAYABLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.ACCOUNT_PAYABLE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const menuActions = [
    {
      label: "Editar Conta a Pagar",
      onClick: handleCloseDashboardUpdateAccountPayable,
      disabled: !permissionsRequired.hasAllPermissions,
      tooltip: !permissionsRequired.hasAllPermissions
        ? permissionsRequired.tooltipMessage
        : "",
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
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
          <DashboardDeleteAccountPayableForm
            accountPayableId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isDashboardUpdateAccountPayableOpen && (
        <DashboardUpdateAccountPayableForm
          accountPayableData={collumnRowAction}
          handleCloseUpdateAccountPayable={
            handleCloseDashboardUpdateAccountPayable
          }
          isUpdateAccountPayableOpen={isDashboardUpdateAccountPayableOpen}
        />
      )}
    </>
  );
}
