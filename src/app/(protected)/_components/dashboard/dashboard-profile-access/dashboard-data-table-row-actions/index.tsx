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

import { profileAccessTableSchema } from "@/schemas/profile-access-schema";
import { DashboardDeleteProfileAccessForm } from "../dashboard-delete-profile-access-form";

import { DashboardUpdateProfileAccessForm } from "../dashboard-update-profile-access-form";
import { useDashboardUpdateProfileAccessForm } from "./hooks";

import { toast } from "sonner";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DashboardDataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableProfileAccessRowActions<TData>({
  row,
}: DashboardDataTableRowActionsProps<TData>) {
  const collumnRowAction = profileAccessTableSchema.parse(row.original);
  const {
    isUpdateProfileAccessOpen,
    handleOpenUpdateProfileAccess,
    handleOpenDropdown,
    isDropdownOpen,
  } = useDashboardUpdateProfileAccessForm();

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

  const hasUserPermission = useHasPermission(
    permissions.PROFILE_ACCESS_MANAGE,
    "write",
  );

  const menuActions = [
    {
      label: "Editar Perfil",
      onClick: handleOpenUpdateProfileAccess,
      disabled: !hasUserPermission,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
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
            <DropdownMenuItem
              key={action.label}
              className="cursor-pointer 
              truncate block"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DashboardDeleteProfileAccessForm
            profileAccessId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateProfileAccessOpen && (
        <DashboardUpdateProfileAccessForm
          profileAccessData={collumnRowAction}
          handleCloseUpdateProfileAccess={handleOpenUpdateProfileAccess}
          isUpdateProfileAccess={isUpdateProfileAccessOpen}
        />
      )}
    </>
  );
}
