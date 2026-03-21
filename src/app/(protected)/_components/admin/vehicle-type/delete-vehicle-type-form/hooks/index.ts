import { useEffect, useRef, useState } from "react";
import type { DeleteVehicleTypeFormState } from "../delete-vehicle-type-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDeleteVehicleTypeForm(state: DeleteVehicleTypeFormState | null) {
  const toastShownRef = useRef(false);
  const [isOpenDeleteVehicleTypeForm, setIsOpenDeleteVehicleTypeForm] =
    useState<boolean>(false);

  const handleDeleteVehicleTypeForm = () => {
    setIsOpenDeleteVehicleTypeForm(!isOpenDeleteVehicleTypeForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.deleteVehicleTypeError) {
      toast.error(state.deleteVehicleTypeError);
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
            revalidateTagName("delete-vehicle-type"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "vehicle_type";

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
      handleDeleteVehicleTypeForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteVehicleTypeForm,
    isOpenDeleteVehicleTypeForm,
  };
}

export { useDeleteVehicleTypeForm };
