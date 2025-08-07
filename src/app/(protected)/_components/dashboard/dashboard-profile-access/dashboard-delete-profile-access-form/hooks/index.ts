import { useEffect, useRef, useState } from "react";
import { DashboardDeleteProfileAccessFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useDashboardDeleteProfileAccessForm(
  state: DashboardDeleteProfileAccessFormState | null,
) {
  const toastShownRef = useRef(false);
  const [isOpenDeleteProfileAccessForm, setIsOpenDeleteProfileAccessForm] =
    useState<boolean>(false);

  const handleDeleteProfileAccessForm = () => {
    setIsOpenDeleteProfileAccessForm(!isOpenDeleteProfileAccessForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteProfileAccessError) {
      toast.error(state.deleteProfileAccessError);
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
            revalidateTagName("delete-profile-access"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "profile";

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
      handleDeleteProfileAccessForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteProfileAccessForm,
    isOpenDeleteProfileAccessForm,
  };
}

export { useDashboardDeleteProfileAccessForm };
