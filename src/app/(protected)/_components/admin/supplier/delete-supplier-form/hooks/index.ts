import { useEffect, useRef, useState } from "react";
import { DeleteSupplierFormState } from "../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

import { queryClientProps } from "@/lib/query-client-props";

function useDeleteSupplierForm(state: DeleteSupplierFormState | null) {
  const toastShownRef = useRef(false);
  const [isOpenDeleteSupplierForm, setIsOpenDeleteSupplierForm] =
    useState<boolean>(false);

  const handleDeleteSupplierForm = () => {
    setIsOpenDeleteSupplierForm(!isOpenDeleteSupplierForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteSupplierError) {
      toast.error(state.deleteSupplierError);
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
            revalidateTagName("delete-supplier"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "supplier";

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
      handleDeleteSupplierForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteSupplierForm,
    isOpenDeleteSupplierForm,
  };
}

export { useDeleteSupplierForm };
