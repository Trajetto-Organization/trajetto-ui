"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { DeliveryDetailDialog } from "../deliveries/detail-dialog";

import type { OccurrenceRow } from "../lib/panels";

interface OccurrenceRowActionsProps {
  row: Row<OccurrenceRow>;
}

/**
 * An occurrence is an immutable field record — there is nothing to edit or
 * delete here. What the manager wants from a row is the delivery behind it
 * and the ids to search with.
 */
const OccurrenceRowActions = ({
  row,
}: OccurrenceRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const occurrence = row.original;

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const copyId = (value: string, label: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado para a área de transferência!`))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  const menuActions = [
    {
      label: "Ver Entrega",
      onClick: () => {
        setIsDropdownOpen(false);
        setIsDetailOpen(true);
      },
    },
    {
      label: "Copiar ID",
      onClick: () => copyId(occurrence.id, "ID da ocorrência"),
    },
    {
      // Pasting it in the search returns every occurrence of that delivery.
      label: "Copiar ID da Entrega",
      onClick: () => copyId(occurrence.delivery.id, "ID da entrega"),
    },
  ];

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal />
            <span className="sr-only">Abrir Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {menuActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              className="cursor-pointer truncate block"
              onClick={action.onClick}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isDetailOpen && businessId && (
        <DeliveryDetailDialog
          businessId={businessId}
          deliveryId={occurrence.delivery.id}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </>
  );
};

export { OccurrenceRowActions };
