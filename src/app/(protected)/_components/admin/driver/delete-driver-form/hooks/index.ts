import { useEffect, useRef, useState } from "react";
import type { DeleteDriverFormState } from "../delete-driver-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDeleteDriverForm(state: DeleteDriverFormState | null) {
  const [isOpenDeleteDriverForm, setIsOpenDeleteDriverForm] =
    useState<boolean>(false);

  const handleDeleteDriverForm = () => {
    setIsOpenDeleteDriverForm(!isOpenDeleteDriverForm);
  };

  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.deleteDriverError) {
      toast.error(state.deleteDriverError);
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
            revalidateTagName("delete-driver"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "driver";

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
      handleDeleteDriverForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteDriverForm,
    isOpenDeleteDriverForm,
  };
}

export { useDeleteDriverForm };
