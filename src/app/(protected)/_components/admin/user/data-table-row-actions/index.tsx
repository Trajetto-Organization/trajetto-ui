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
import { useUpdateUserForm } from "./hooks";

import { UpdateUserForm } from "../update-user-form";
import { DeleteUserForm } from "../delete-user-form";

import { RevokeUserAccessForm } from "../revoke-user-access";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableUserRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = userTableSchema.parse(row.original);
  const {
    isUpdateUserOpen,
    handleOpenUpdateUser,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdateUserForm();

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

  const menuActions = [
    {
      label: "Editar Usuário",
      onClick: handleOpenUpdateUser,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
    },
    ...(collumnRowAction.profileAccessId
      ? [
          {
            label: "Copiar ID do perfil",
            onClick: () =>
              handleCopyID(collumnRowAction.profileAccessId as string),
          },
        ]
      : []),
    ...(collumnRowAction.driverId
      ? [
          {
            label: "Copiar ID do motorista",
            onClick: () => handleCopyID(collumnRowAction.driverId as string),
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
            <DropdownMenuItem
              key={action.label}
              className="cursor-pointer 
              truncate block"
              onClick={action.onClick}
            >
              {action.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <RevokeUserAccessForm
            access_revoked={collumnRowAction.access_revoked}
            userId={collumnRowAction.id}
          />
          <DeleteUserForm userId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateUserOpen && (
        <UpdateUserForm
          userData={collumnRowAction}
          handleOpenUpdateUser={handleOpenUpdateUser}
          isUpdateUser={isUpdateUserOpen}
        />
      )}
    </>
  );
}
