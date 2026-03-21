"use client";

import { Loader } from "lucide-react";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { handleUpdateQuoteStatus } from "@/actions/quote/update-quote-status";

import type { QuoteProps, QuoteStatus } from "../quote.types";
import type {
  UpdateQuoteFormSubmitProps,
  UpdateQuoteFormState,
} from "./update-quote-status-modal.types";

import { useFormState, useFormStatus } from "react-dom";
import { appendDataToForm } from "@/lib/append-data-form";

import { useQuoteFormStatus } from "./hooks";

interface UpdateQuoteStatusModalProps {
  quote: QuoteProps;
  isOpen: boolean;
  onClose: () => void;
}

// Type the status options to ensure type safety
const statusOptions: Record<
  QuoteStatus,
  Array<{ value: string; label: string }>
> = {
  PENDING: [
    { value: "PENDING", label: "Pendente" },
    { value: "CONTACTED", label: "Contatado" },
    { value: "CLOSED", label: "Fechado" },
  ],
  CONTACTED: [
    { value: "CONTACTED", label: "Contatado" },
    { value: "CLOSED", label: "Fechado" },
    { value: "CONVERTED", label: "Convertido" },
  ],
  CLOSED: [],
  CONVERTED: [],
};

const UpdateQuoteStatusModalFormSubmit = ({
  originalStatus,
  state,
  notes,
  status,
  onClose,
  handleUpdateNotes,
  handleUpdateStatus,
  isQuoteStatusDirty,
}: UpdateQuoteFormSubmitProps & {
  originalStatus: QuoteStatus;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const availableOptions = statusOptions[originalStatus] || [];

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="status"
            className={state.updateQuoteError?.status ? "text-red-500" : ""}
          >
            {state.updateQuoteError?.status
              ? state.updateQuoteError.status
              : "Novo Status"}
          </Label>
          <Select
            name="status"
            value={status}
            onValueChange={(value) => handleUpdateStatus(value as QuoteStatus)}
            disabled={pending}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Selecione um status" />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.length === 0 ? (
                <SelectItem value="none" disabled>
                  Nenhuma opção disponível
                </SelectItem>
              ) : (
                availableOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="notes"
            className={state.updateQuoteError?.notes ? "text-red-500" : ""}
          >
            {state.updateQuoteError?.notes
              ? state.updateQuoteError.notes
              : "Notas Internas (opcional)"}
          </Label>
          <Textarea
            id="notes"
            name="notes"
            value={(notes as string) || ""}
            onChange={(e) => handleUpdateNotes(e.target.value)}
            placeholder="Adicione notas sobre a negociação..."
            className="min-h-[120px] resize-none"
            disabled={pending}
          />
        </div>
      </div>

      <DialogFooter className="mt-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isQuoteStatusDirty}>
          Atualizar Status
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFooter>
    </>
  );
};

const UpdateQuoteStatusModal = ({
  quote,
  isOpen,
  onClose,
}: UpdateQuoteStatusModalProps): JSX.Element => {
  const defaultState: UpdateQuoteFormState = {};
  const [state, dispatch] = useFormState<UpdateQuoteFormState, FormData>(
    handleUpdateQuoteStatus,
    defaultState,
  );

  const {
    formRef,
    notes,
    status,
    handleUpdateNotes,
    handleUpdateStatus,
    isQuoteStatusDirty,
  } = useQuoteFormStatus({
    quote,
    state,
    onClose,
    isOpen,
  });

  const updateQuoteStatusModalForm = (updateQuoteStatusFormData: FormData) => {
    const updateQuoteStatusData = {
      quoteId: quote.id,
      status,
      notes: notes as string,
    };

    appendDataToForm(updateQuoteStatusFormData, updateQuoteStatusData);
    return dispatch(updateQuoteStatusFormData);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          formRef.current?.reset();
          onClose();
        }
      }}
    >
      <DialogScrollContent
        className="max-w-md overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Atualizar Status do Orçamento</DialogTitle>
          <DialogDescription>
            Atualize o status do orçamento e adicione notas se necessário.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateQuoteStatusModalForm}>
          <UpdateQuoteStatusModalFormSubmit
            originalStatus={quote.status}
            state={state}
            notes={notes}
            status={status}
            onClose={onClose}
            handleUpdateNotes={handleUpdateNotes}
            handleUpdateStatus={handleUpdateStatus}
            isQuoteStatusDirty={isQuoteStatusDirty}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateQuoteStatusModal };
