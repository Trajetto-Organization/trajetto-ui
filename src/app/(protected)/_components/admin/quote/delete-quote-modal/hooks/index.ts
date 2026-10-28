import { useEffect, useRef } from "react";
import type { DeleteQuoteFormState } from "../delete-quote-modal.types";

import { toast } from "sonner";

interface UseDeleteQuoteFormProps {
  state: DeleteQuoteFormState | null;
  onClose: () => void;
}

function useDeleteQuoteForm({ state, onClose }: UseDeleteQuoteFormProps) {
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.deleteQuoteError) {
      toast.error(state.deleteQuoteError);
      return;
    }

    // Handle success case
    if (state?.successMessage && !toastShownRef.current) {
      // Mark toast as shown to prevent duplicates
      toastShownRef.current = true;

      // Show the toast first
      toast.success(state.successMessage);

      // The action re-rendered the screen in its own response.

      // Close the modal immediately after showing toast
      onClose();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);
}

export { useDeleteQuoteForm };
