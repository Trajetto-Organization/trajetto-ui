import { useEffect, useRef } from "react";

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

      // The action re-rendered the screen in its own response.
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
