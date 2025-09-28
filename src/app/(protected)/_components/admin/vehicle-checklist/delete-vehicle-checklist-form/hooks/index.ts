import { useEffect, useRef, useState } from "react";
import { DeleteVehicleChecklistFormState } from "../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

function useDeleteVehicleChecklistForm(
  state: DeleteVehicleChecklistFormState | null,
) {
  const toastShownRef = useRef(false);
  const [
    isOpenDeleteVehicleChecklistForm,
    setIsOpenDeleteVehicleChecklistForm,
  ] = useState<boolean>(false);

  const handleDeleteVehicleChecklistForm = () => {
    setIsOpenDeleteVehicleChecklistForm(!isOpenDeleteVehicleChecklistForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteVehicleChecklistError) {
      toast.error(state.deleteVehicleChecklistError);
      return;
    }

    // Handle success case
    if (state?.successMessage && !toastShownRef.current) {
      // Mark toast as shown to prevent duplicates
      toastShownRef.current = true;

      // Show the toast first
      toast.success(state.successMessage);

      // Start revalidation in background
      const performRevalidation = async () => {
        try {
          await revalidateTagName("delete-vehicle-checklist");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleDeleteVehicleChecklistForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteVehicleChecklistForm,
    isOpenDeleteVehicleChecklistForm,
  };
}

export { useDeleteVehicleChecklistForm };
