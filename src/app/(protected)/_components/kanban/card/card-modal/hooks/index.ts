import { useEffect, useRef } from "react";
import { UseCardModalProps } from "../dto";

import { useKanbanQueryClient } from "../../../hooks/use-query-client";
import { toast } from "sonner";

function useCardModal({
  state,
  onClose,
  isEditing,
  businessId,
}: UseCardModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const { invalidateKanbanQueries } = useKanbanQueryClient();

  useEffect(() => {
    if (isEditing && state?.updateCardError?.updateCardErrorMessage) {
      toast.error(state.updateCardError.updateCardErrorMessage);
      return;
    }

    if (!isEditing && state?.createCardError?.createCardErrorMessage) {
      toast.error(state.createCardError.createCardErrorMessage);
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
  }, [state, isEditing, businessId, invalidateKanbanQueries, onClose]);

  return {
    formRef,
  };
}

export { useCardModal };
