import { useEffect, useRef } from "react";

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

      // The action re-rendered the screen in its own response.
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
