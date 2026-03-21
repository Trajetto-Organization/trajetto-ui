import { useEffect, useRef } from "react";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

interface UpdateAILimitFormState {
  successMessage?: string;
  updateAILimitError?: {
    updateAILimitErrorMessage?: string;
    ai_analysis_limit?: string[];
  };
}

interface UseUpdateAILimitFormProps {
  state: UpdateAILimitFormState;
  handleCloseAILimit: () => void;
}

function useUpdateAILimitForm({
  state,
  handleCloseAILimit,
}: UseUpdateAILimitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (state?.updateAILimitError?.updateAILimitErrorMessage) {
      toast.error(state.updateAILimitError.updateAILimitErrorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-ai-usage");
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      handleCloseAILimit();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseAILimit]);

  return {
    formRef,
  };
}

export { useUpdateAILimitForm };
export type { UpdateAILimitFormState };
