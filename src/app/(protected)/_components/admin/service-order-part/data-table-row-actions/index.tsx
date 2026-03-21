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

import { DeleteServiceOrderPartForm } from "../delete-service-order-part-form";
import { UpdateServiceOrderPartForm } from "../update-service-order-part-form";

import { useUpdateServiceOrderPartForm } from "./hooks";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableServiceOrderPartRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = serviceOrderPartTableSchema.parse(row.original);
  const {
    handleCloseUpdateServiceOrderPart,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateServiceOrderPartOpen,
  } = useUpdateServiceOrderPartForm();

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
      label: "Editar Ordem de Serviço da Peça",
      onClick: handleCloseUpdateServiceOrderPart,
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
          <DeleteServiceOrderPartForm
            businessId={collumnRowAction.businessId}
            serviceOrderPartId={collumnRowAction.id}
            serviceOrderId={collumnRowAction.serviceOrderId}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateServiceOrderPartOpen && (
        <UpdateServiceOrderPartForm
          serviceOrderPartData={collumnRowAction}
          handleCloseUpdateServiceOrderPart={handleCloseUpdateServiceOrderPart}
          isUpdateServiceOrderPartOpen={isUpdateServiceOrderPartOpen}
        />
      )}
    </>
  );
}
