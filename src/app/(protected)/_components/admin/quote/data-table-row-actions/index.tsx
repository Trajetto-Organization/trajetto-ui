"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import { MoreHorizontal, Eye, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { QuoteProps } from "../quote.types";
import { ViewQuoteModal } from "../view-quote-modal";

import { UpdateQuoteStatusModal } from "../update-quote-status-modal";
import { DeleteQuoteModal } from "../delete-quote-modal";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableQuoteRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const quote = row.original as QuoteProps;

  const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState<boolean>(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCopyID = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        toast.success("ID copiado para a área de transferência!");
      })
      .catch((err) => {
        toast.error("Erro ao copiar o ID: " + err);
      });
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard
      .writeText(email)
      .then(() => {
        toast.success("E-mail copiado para a área de transferência!");
      })
      .catch((err) => {
        toast.error("Erro ao copiar o e-mail: " + err);
      });
  };

  const isQuoteClosedOrConverted = (quoteStatus: string) => {
    return quoteStatus === "CLOSED" || quoteStatus === "CONVERTED";
  };

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
          <DropdownMenuItem
            className="cursor-pointer flex items-center"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsViewOpen(true);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer flex items-center"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsUpdateOpen(true);
            }}
            disabled={isQuoteClosedOrConverted(quote.status)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Atualizar Status
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => handleCopyID(quote.id)}
          >
            Copiar ID
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => handleCopyEmail(quote.email)}
          >
            Copiar E-mail
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex items-center text-red-600"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsDeleteOpen(true);
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isViewOpen && (
        <ViewQuoteModal
          quote={quote}
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
        />
      )}

      {isUpdateOpen && (
        <UpdateQuoteStatusModal
          quote={quote}
          isOpen={isUpdateOpen}
          onClose={() => setIsUpdateOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <DeleteQuoteModal
          quote={quote}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
