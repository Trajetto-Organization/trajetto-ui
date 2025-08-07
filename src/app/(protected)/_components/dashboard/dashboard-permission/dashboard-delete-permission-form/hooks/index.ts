import { useEffect, useRef, useState } from "react";
import { DashboardDeletePermissionFormState } from "../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

function useDashboardDeletePermissionForm(
  state: DashboardDeletePermissionFormState | null,
) {
  const toastShownRef = useRef(false);
  const [isOpenDeletePermissionForm, setIsOpenDeletePermissionForm] =
    useState<boolean>(false);

  const handleDeletePermissionForm = () => {
    setIsOpenDeletePermissionForm(!isOpenDeletePermissionForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deletePermissionError) {
      toast.error(state.deletePermissionError);
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
          await revalidateTagName("delete-permission");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleDeletePermissionForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeletePermissionForm,
    isOpenDeletePermissionForm,
  };
}

export { useDashboardDeletePermissionForm };
