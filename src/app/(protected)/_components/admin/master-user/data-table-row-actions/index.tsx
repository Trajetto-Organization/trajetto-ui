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
import { masterUserTableSchema } from "@/schemas/master-user-table-schema";

import { UpdateMasterUserForm } from "../update-master-user-form";
import { DeleteMasterUserForm } from "../delete-master-user-form";

import { RevokeMasterUserAccessForm } from "../revoke-master-user-access";
import { useUpdateMasterUserForm } from "./hooks";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableMasterUserRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = masterUserTableSchema.parse(row.original);
  const {
    isUpdateMasterUserOpen,
    handleOpenUpdateMasterUser,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdateMasterUserForm();

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
      label: "Editar Usuário Master",
      onClick: handleOpenUpdateMasterUser,
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
          <RevokeMasterUserAccessForm
            access_revoked={collumnRowAction.access_revoked}
            masterUserId={collumnRowAction.id}
          />
          <DeleteMasterUserForm masterUserId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateMasterUserOpen && (
        <UpdateMasterUserForm
          masterUserData={collumnRowAction}
          handleOpenUpdateMasterUser={handleOpenUpdateMasterUser}
          isUpdateMasterUser={isUpdateMasterUserOpen}
        />
      )}
    </>
  );
}
