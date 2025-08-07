import { useEffect, useRef, useState } from "react";
import { QuoteProps, QuoteStatus } from "../../dto";

import { UpdateQuoteFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

interface UseQuoteFormStatusProps {
  state: UpdateQuoteFormState | null;
  onClose: () => void;
  quote: QuoteProps;
  isOpen: boolean;
}

function useQuoteFormStatus({
  onClose,
  quote,
  state,
  isOpen,
}: UseQuoteFormStatusProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const originalStatusRef = useRef<QuoteStatus>(quote.status);
  const originalNotesRef = useRef<string | null | undefined>(quote.notes);

  const [status, setStatus] = useState<QuoteStatus>(quote.status);
  const [notes, setNotes] = useState<string | null | undefined>(quote.notes);

  useEffect(() => {
    if (isOpen) {
      originalStatusRef.current = quote.status;
      originalNotesRef.current = quote.notes;

      setNotes(quote.notes);
      setStatus(quote.status);
    }
  }, [quote, isOpen]);

  const handleUpdateNotes = (updateNotes: string) => {
    setNotes(updateNotes);
  };

  const handleUpdateStatus = (updateStatus: QuoteStatus) => {
    setStatus(updateStatus);
  };

  // Função para comparação adequada de strings/null/undefined
  const areValuesEqual = (
    val1: string | null | undefined,
    val2: string | null | undefined,
  ) => {
    // Tratar string vazia como null para ambos os valores
    const isEmpty1 = val1 == null || val1.trim() === "";
    const isEmpty2 = val2 == null || val2.trim() === "";

    // Se ambos estão vazios, são iguais
    if (isEmpty1 && isEmpty2) return true;

    // Se apenas um está vazio, são diferentes
    if (isEmpty1 || isEmpty2) return false;

    // Ambos têm conteúdo, compare as strings
    return val1!.trim() === val2!.trim();
  };

  // Verificar se algo mudou comparando com os valores originais
  const isQuoteStatusDirty =
    status !== originalStatusRef.current ||
    !areValuesEqual(notes, originalNotesRef.current);

  useEffect(() => {
    // Handle error case first
    if (state?.updateQuoteError?.updateQuoteErrorMessage) {
      toast.error(state.updateQuoteError.updateQuoteErrorMessage);
      return;
    }

    // Handle success case
    if (state?.successMessage && !toastShownRef.current) {
      // Mark toast as shown to prevent duplicates
      toastShownRef.current = true;

      // Show the toast first
      toast.success(state.successMessage);

      // Start revalidation in background
      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-quote-status");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      onClose();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, onClose]);

  return {
    formRef,
    status,
    notes,
    handleUpdateNotes,
    handleUpdateStatus,
    isQuoteStatusDirty,
  };
}

export { useQuoteFormStatus };
