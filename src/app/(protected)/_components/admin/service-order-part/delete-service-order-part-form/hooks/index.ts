import { useEffect, useRef, useState } from "react";

import type { DeleteServiceOrderPartFormState } from "../delete-service-order-part-form.types";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

function useDeleteServiceOrderPartForm(
  state: DeleteServiceOrderPartFormState | null,
) {
  const [
    isOpenDeleteServiceOrderPartForm,
    setIsOpenDeleteServiceOrderPartForm,
  ] = useState<boolean>(false);

  const handleDeleteServiceOrderPartForm = () => {
    setIsOpenDeleteServiceOrderPartForm(!isOpenDeleteServiceOrderPartForm);
  };

  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.deleteServiceOrderPartError) {
      toast.error(state.deleteServiceOrderPartError);
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
          await revalidateTagName("delete-service-order-part");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately dsafter showing toast
      handleDeleteServiceOrderPartForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteServiceOrderPartForm,
    isOpenDeleteServiceOrderPartForm,
  };
}

export { useDeleteServiceOrderPartForm };
