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
import { DeleteProfileAccessForm } from "../delete-profile-access-form";

import { UpdateProfileAccessForm } from "../update-profile-access-form";
import { useUpdateProfileAccessForm } from "./hooks";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableProfileAccessRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = profileAccessTableSchema.parse(row.original);
  const {
    isUpdateProfileAccessOpen,
    handleOpenUpdateProfileAccess,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdateProfileAccessForm();

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
      label: "Editar Perfil",
      onClick: handleOpenUpdateProfileAccess,
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
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DeleteProfileAccessForm profileAccessId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateProfileAccessOpen && (
        <UpdateProfileAccessForm
          profileAccessData={collumnRowAction}
          handleCloseUpdateProfileAccess={handleOpenUpdateProfileAccess}
          isUpdateProfileAccess={isUpdateProfileAccessOpen}
        />
      )}
    </>
  );
}
