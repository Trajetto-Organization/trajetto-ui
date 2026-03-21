import { useEffect, useRef, useState } from "react";
import type { DeletePartFormState } from "../delete-part-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDeletePartForm(state: DeletePartFormState | null) {
  const toastShownRef = useRef(false);
  const [isOpenDeletePartForm, setIsOpenDeletePartForm] =
    useState<boolean>(false);

  const handleDeletePartForm = () => {
    setIsOpenDeletePartForm(!isOpenDeletePartForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deletePartError) {
      toast.error(state.deletePartError);
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
            revalidateTagName("delete-part"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) && query.queryKey[0] === "part";

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
      handleDeletePartForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeletePartForm,
    isOpenDeletePartForm,
  };
}

export { useDeletePartForm };
