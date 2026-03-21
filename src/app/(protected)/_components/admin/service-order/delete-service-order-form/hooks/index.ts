import { useEffect, useRef, useState } from "react";
import type { DeleteServiceOrderFormState } from "../delete-service-order-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDeleteServiceOrderForm(state: DeleteServiceOrderFormState | null) {
  const [isOpenDeleteServiceOrderForm, setIsOpenDeleteServiceOrderForm] =
    useState<boolean>(false);

  const handleDeleteServiceOrderForm = () => {
    setIsOpenDeleteServiceOrderForm(!isOpenDeleteServiceOrderForm);
  };

  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.deleteServiceOrderError) {
      toast.error(state.deleteServiceOrderError);
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
            revalidateTagName("delete-service-order"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "service_order"
                );
              },
            }),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "vehicleData"
                );
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

      // Close the modal immediately dsafter showing toast
      handleDeleteServiceOrderForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteServiceOrderForm,
    isOpenDeleteServiceOrderForm,
  };
}

export { useDeleteServiceOrderForm };
