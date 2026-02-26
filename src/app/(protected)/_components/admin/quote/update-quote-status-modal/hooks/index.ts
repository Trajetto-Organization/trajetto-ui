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

  // Function for proper comparison of strings/null/undefined
  const areValuesEqual = (
    val1: string | null | undefined,
    val2: string | null | undefined,
  ) => {
    // Treat empty string as null for both values.
    const isEmpty1 = val1 == null || val1.trim() === "";
    const isEmpty2 = val2 == null || val2.trim() === "";

    // If both are empty, they are equal.
    if (isEmpty1 && isEmpty2) return true;

    // If only one is empty, they are different.
    if (isEmpty1 || isEmpty2) return false;

    // Both have content; compare the strings.
    return val1!.trim() === val2!.trim();
  };

  // Check if anything has changed by comparing it to the original values.
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
