import { useEffect, useRef, useState } from "react";
import { DashboardDeleteAccountPayableFormState } from "../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

function useDashboardDeleteAccountPayableForm(
  state: DashboardDeleteAccountPayableFormState | null,
) {
  const [isOpenDeleteAccountPayableForm, setIsOpenDeleteAccountPayableForm] =
    useState<boolean>(false);
  const toastShownRef = useRef(false);

  const handleDeleteAccountPayableForm = () => {
    setIsOpenDeleteAccountPayableForm(!isOpenDeleteAccountPayableForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteAccountPayableError) {
      toast.error(state.deleteAccountPayableError);
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
          await revalidateTagName("delete-account-payable");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleDeleteAccountPayableForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteAccountPayableForm,
    isOpenDeleteAccountPayableForm,
  };
}

export { useDashboardDeleteAccountPayableForm };
