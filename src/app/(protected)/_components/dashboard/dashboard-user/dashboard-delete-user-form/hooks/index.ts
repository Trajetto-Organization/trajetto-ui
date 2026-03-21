import { useEffect, useRef, useState } from "react";
import type { DashboardDeleteUserFormState } from "../dashboard-delete-user-form.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

function useDashboardDeleteUserForm(
  state: DashboardDeleteUserFormState | null,
) {
  const toastShownRef = useRef(false);
  const [isOpenDeleteUserForm, setIsOpenDeleteUserForm] =
    useState<boolean>(false);

  const handleDeleteUserForm = () => {
    setIsOpenDeleteUserForm(!isOpenDeleteUserForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteUserError) {
      toast.error(state.deleteUserError);
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
          await Promise.all([
            revalidateTagName("delete-user-registration"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) && query.queryKey[0] === "user";

                return isMatch;
              },
            }),
          ]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleDeleteUserForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteUserForm,
    isOpenDeleteUserForm,
  };
}

export { useDashboardDeleteUserForm };
