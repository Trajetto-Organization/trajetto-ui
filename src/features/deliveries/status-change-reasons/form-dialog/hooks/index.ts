import { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { toast } from "sonner";

interface StatusChangeReasonFormState {
  successMessage?: string;
  createStatusChangeReasonError?: {
    createStatusChangeReasonErrorMessage?: string;
    name?: string[];
    description?: string[];
  };
  updateStatusChangeReasonError?: {
    updateStatusChangeReasonErrorMessage?: string;
    name?: string[];
    description?: string[];
  };
}

interface UseStatusChangeReasonFormProps {
  state: StatusChangeReasonFormState;
  onClose: () => void;
}

function useStatusChangeReasonForm({
  state,
  onClose,
}: UseStatusChangeReasonFormProps) {
  const queryClient = useQueryClient();

  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    const errorMessage =
      state?.createStatusChangeReasonError
        ?.createStatusChangeReasonErrorMessage ??
      state?.updateStatusChangeReasonError
        ?.updateStatusChangeReasonErrorMessage;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          // The picker inside the status dialog keeps its own react-query
          // cache. Revalidating the server tag alone would leave a retired
          // reason still on offer — or a brand new one missing, which is how
          // an operator ends up creating it twice.
          await queryClient.invalidateQueries(["status_change_reason"]);
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

export { useStatusChangeReasonForm };
export type { StatusChangeReasonFormState };
