import { useEffect, useRef } from "react";
import { UseUpdateColumnDialogProps } from "../dto";

import { useKanbanQueryClient } from "../../../hooks/use-query-client";
import { toast } from "sonner";

function useUpdateColumnDialog({
  state,
  onClose,
  businessId,
}: UseUpdateColumnDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const { invalidateKanbanQueries } = useKanbanQueryClient();

  useEffect(() => {
    if (state?.updateColumnError?.updateColumnErrorMessage) {
      toast.error(state.updateColumnError.updateColumnErrorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;

      const performRevalidation = async () => {
        try {
          await invalidateKanbanQueries(businessId);
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      toast.success(state.successMessage);
      formRef.current?.reset();

      onClose();
      performRevalidation();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, businessId]);

  return {
    formRef,
  };
}

export { useUpdateColumnDialog };
