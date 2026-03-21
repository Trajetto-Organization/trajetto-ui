import { useEffect, useRef } from "react";
import type { CreateColumnModalFormState } from "../create-column-modal.types";

import { useKanbanQueryClient } from "../../../hooks/query-client";
import { toast } from "sonner";

interface UseCreateColumnModalProps {
  state: CreateColumnModalFormState | null;
  onClose: () => void;
  businessId?: string;
}

function useCreateColumnModal({
  state,
  onClose,
  businessId,
}: UseCreateColumnModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const { invalidateKanbanQueries } = useKanbanQueryClient();

  useEffect(() => {
    if (state?.createColumnError?.createColumnErrorMessage) {
      toast.error(state.createColumnError.createColumnErrorMessage);
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

export { useCreateColumnModal };
