import { useEffect, useRef } from "react";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

interface UpdateVehicleLimitFormState {
  successMessage?: string;
  updateVehicleLimitError?: {
    updateVehicleLimitErrorMessage?: string;
    vehicle_limit?: string[];
  };
}

interface UseUpdateVehicleLimitFormProps {
  state: UpdateVehicleLimitFormState;
  handleClose: () => void;
}

function useUpdateVehicleLimitForm({
  state,
  handleClose,
}: UseUpdateVehicleLimitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (state?.updateVehicleLimitError?.updateVehicleLimitErrorMessage) {
      toast.error(state.updateVehicleLimitError.updateVehicleLimitErrorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          // The business table shows the contracted limit, so the list cache
          // must drop alongside the limits panel data.
          await revalidateTagName("update-business");
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      handleClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleClose]);

  return {
    formRef,
  };
}

export { useUpdateVehicleLimitForm };
export type { UpdateVehicleLimitFormState };
