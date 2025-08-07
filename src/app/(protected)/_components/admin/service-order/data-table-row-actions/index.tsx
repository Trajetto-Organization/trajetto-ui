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

import { useUpdateServiceOrderForm } from "./hooks";
import { DeleteServiceOrderForm } from "../delete-service-order-form";

import { toast } from "sonner";
import { UpdateServiceOrderForm } from "../update-service-order-form";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableServiceOrderRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = serviceOrderTableSchema.parse(row.original);
  const {
    handleCloseUpdateServiceOrder,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateServiceOrderOpen,
  } = useUpdateServiceOrderForm();

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
      label: "Editar Ordem de Serviço",
      onClick: handleCloseUpdateServiceOrder,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
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
          <DeleteServiceOrderForm
            businessId={collumnRowAction.businessId as string}
            serviceOrderId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateServiceOrderOpen && (
        <UpdateServiceOrderForm
          serviceOrderData={collumnRowAction}
          handleCloseUpdateServiceOrder={handleCloseUpdateServiceOrder}
          isUpdateServiceOrderOpen={isUpdateServiceOrderOpen}
        />
      )}
    </>
  );
}
