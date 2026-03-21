import { useEffect, useRef, useState } from "react";
import type { DeleteFuelFormState } from "../delete-fuel-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDeleteFuelForm(state: DeleteFuelFormState | null) {
  const [isOpenDeleteFuelForm, setIsOpenDeleteFuelForm] =
    useState<boolean>(false);

  const handleDeleteFuelForm = () => {
    setIsOpenDeleteFuelForm(!isOpenDeleteFuelForm);
  };

  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.deleteFuelError) {
      toast.error(state.deleteFuelError);
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
            revalidateTagName("delete-fuel"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) && query.queryKey[0] === "fuel"
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
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "previousFuel"
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

      // Close the modal immediately after showing toast
      handleDeleteFuelForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteFuelForm,
    isOpenDeleteFuelForm,
  };
}

export { useDeleteFuelForm };
