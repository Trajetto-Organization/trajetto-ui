import { useEffect, useRef, useState } from "react";
import type { DashboardDeleteVehicleFormState } from "../dashboard-delete-vehicle-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDashboardDeleteVehicleForm(
  state: DashboardDeleteVehicleFormState | null,
) {
  const [isOpenDeleteVehicleForm, setIsOpenDeleteVehicleForm] =
    useState<boolean>(false);

  const handleDeleteVehicleForm = () => {
    setIsOpenDeleteVehicleForm(!isOpenDeleteVehicleForm);
  };

  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.deleteVehicleError) {
      toast.error(state.deleteVehicleError);
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
            revalidateTagName("delete-vehicle"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "vehicle";

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

      // Close the modal immediately dsafter showing toast
      handleDeleteVehicleForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteVehicleForm,
    isOpenDeleteVehicleForm,
  };
}

export { useDashboardDeleteVehicleForm };
