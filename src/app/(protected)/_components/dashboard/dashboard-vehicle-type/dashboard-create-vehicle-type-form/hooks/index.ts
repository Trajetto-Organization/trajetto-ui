import { useEffect, useRef, useState } from "react";
import type { DashboardCreateVehicleTypeFormState } from "../dashboard-create-vehicle-type-form.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

function useDashboardCreateVehicleTypeForm(
  state: DashboardCreateVehicleTypeFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateCreateVehicleTypeForm, setIsCreateVehicleTypeForm] =
    useState<boolean>(false);

  const handleOpenCreateVehicleTypeForm = () => {
    setIsCreateVehicleTypeForm(!isCreateCreateVehicleTypeForm);

    if (isCreateCreateVehicleTypeForm) {
      formRef.current?.reset();
    }
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createVehicleTypeError?.createVehicleTypeErrorMessage) {
      toast.error(state.createVehicleTypeError.createVehicleTypeErrorMessage);
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
            revalidateTagName("create-vehicle-type"),
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
      handleOpenCreateVehicleTypeForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateCreateVehicleTypeForm,
    handleOpenCreateVehicleTypeForm,
    formRef,
  };
}

export { useDashboardCreateVehicleTypeForm };
