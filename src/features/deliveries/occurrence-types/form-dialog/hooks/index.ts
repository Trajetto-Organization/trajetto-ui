import { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { toast } from "sonner";

import { revalidateTagName } from "@/actions/revalidate";

interface OccurrenceTypeFormState {
  successMessage?: string;
  createOccurrenceTypeError?: {
    createOccurrenceTypeErrorMessage?: string;
    name?: string[];
    description?: string[];
  };
  updateOccurrenceTypeError?: {
    updateOccurrenceTypeErrorMessage?: string;
    name?: string[];
    description?: string[];
  };
}

interface UseOccurrenceTypeFormProps {
  state: OccurrenceTypeFormState;
  onClose: () => void;
}

function useOccurrenceTypeForm({
  state,
  onClose,
}: UseOccurrenceTypeFormProps) {
  const queryClient = useQueryClient();

  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    const errorMessage =
      state?.createOccurrenceTypeError?.createOccurrenceTypeErrorMessage ??
      state?.updateOccurrenceTypeError?.updateOccurrenceTypeErrorMessage;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-occurrence-type");

          // The selectors inside the delivery form keep their own
          // react-query cache, so revalidating the server tag alone
          // left a deactivated record still selectable there.
          await queryClient.invalidateQueries(["occurrence-types-select"]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      onClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, onClose]);

  return { formRef };
}

export { useOccurrenceTypeForm };
export type { OccurrenceTypeFormState };
