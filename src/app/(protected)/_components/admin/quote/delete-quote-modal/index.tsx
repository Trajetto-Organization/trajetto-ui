"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, ShieldAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { QuoteProps } from "../quote.types";
import { Button } from "@/components/ui/button";

import { handleDeleteQuote } from "@/actions/quote/delete-quote";
import { useDeleteQuoteForm } from "./hooks";

interface DeleteQuoteModalProps {
  quote: QuoteProps;
  isOpen: boolean;
  onClose: () => void;
}

interface DeleteQuoteModalButton {
  quote: QuoteProps;
}

const DeleteQuoteModalFormSubmit = ({
  quote,
}: DeleteQuoteModalButton): JSX.Element => {
  const { pending } = useFormStatus();
  const statusLabels = {
    PENDING: "Pendente",
    CONTACTED: "Contatado",
    CLOSED: "Fechado",
    CONVERTED: "Convertido",
  };

  const deleteQuoteModalDataContactList = [
    { data: `Empresa: ${quote.company}` },
    { data: `Contato: ${quote.name}` },
    { data: `E-mail: ${quote.email}` },
    { data: `Status: ${statusLabels[quote.status]}` },
  ];

  const deleteQuoteModalList = [
    { data: `Todos os dados do orçamento serão excluídos permanentemente` },
    { data: `Não há registros relacionados que serão afetados` },
    { data: `Status: ${statusLabels[quote.status]}` },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Orçamento</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            Tem certeza que deseja deletar este orçamento?
            <span className="block mt-4 font-medium text-foreground">
              Informações do orçamento:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteQuoteModalDataContactList.map(({ data }, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
              ))}
            </ul>
            <span className="block mt-4 font-medium text-foreground">
              Consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteQuoteModalList.map(({ data }, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
              ))}
            </ul>
            <span
              className="block mt-4 text-red-600 
              dark:text-red-400 font-medium"
            >
              Esta ação não pode ser desfeita!
            </span>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-6">
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <Button
          type="submit"
          disabled={pending}
          variant="secondary"
          className="bg-red-600/10 dark:bg-red-500/10 
        dark:text-red-500 text-red-600"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar Orçamento</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const DeleteQuoteModal = ({
  quote,
  isOpen,
  onClose,
}: DeleteQuoteModalProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteQuote({ quoteId: quote.id }),
    null,
  );

  useDeleteQuoteForm({ state, onClose });

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent
        className="bg-white 
        dark:bg-[#121214]"
      >
        <form action={dispatch}>
          <DeleteQuoteModalFormSubmit quote={quote} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteQuoteModal };
