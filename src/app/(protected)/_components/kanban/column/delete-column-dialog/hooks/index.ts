import { useEffect, useRef } from "react";

import { useKanbanQueryClient } from "../../../hooks/use-query-client";
import { UseDeleteColumnDialogProps } from "../dto";

import { toast } from "sonner";

function useDeleteColumnDialog({
  state,
  onClose,
  businessId,
}: UseDeleteColumnDialogProps) {
  const toastShownRef = useRef(false);
  const { invalidateKanbanQueries } = useKanbanQueryClient();

  useEffect(() => {
    if (state?.deleteColumnError) {
      toast.error(state.deleteColumnError);
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

      onClose();
      performRevalidation();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, businessId]);
}

export { useDeleteColumnDialog };
