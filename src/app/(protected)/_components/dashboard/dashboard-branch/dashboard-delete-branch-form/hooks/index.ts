import { useEffect, useRef, useState } from "react";
import { DashboardDeleteBranchFormState } from "../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

import { queryClientProps } from "@/lib/query-client-props";

function useDashboardDeleteBranchForm(
  state: DashboardDeleteBranchFormState | null,
) {
  const toastShownRef = useRef(false);
  const [isOpenDeleteBusinessForm, setIsOpenDeleteBusinessForm] =
    useState<boolean>(false);

  const handleDeleteBusinessForm = () => {
    setIsOpenDeleteBusinessForm(!isOpenDeleteBusinessForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteBranchError) {
      toast.error(state.deleteBranchError);
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
            revalidateTagName("delete-branch"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "branch";

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
      handleDeleteBusinessForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteBusinessForm,
    isOpenDeleteBusinessForm,
  };
}

export { useDashboardDeleteBranchForm };
