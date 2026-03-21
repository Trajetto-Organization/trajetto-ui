import { useEffect, useRef, useState } from "react";

import type { DashboardUpdateFuelTypeFormState } from "../dashboard-update-fuel-type-form.types";
import type { DashboardFuelTypeProps } from "../../dashboard-fuel-types.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

interface UseDashboardUpdateFuelTypeFormProps {
  state: DashboardUpdateFuelTypeFormState | null;
  handleCloseUpdateFuelType: () => void;
  fuelTypeValues: DashboardFuelTypeProps;
  isUpdateFuelTypeOpen: boolean;
}

function useDashboardUpdateFuelTypeForm({
  state,
  handleCloseUpdateFuelType,
  isUpdateFuelTypeOpen,
  fuelTypeValues: { description: fuelTypeDescription },
}: UseDashboardUpdateFuelTypeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [description, setDescription] = useState<string>(fuelTypeDescription);

  useEffect(() => {
    if (!isUpdateFuelTypeOpen) {
      setDescription(fuelTypeDescription);
    }
  }, [isUpdateFuelTypeOpen, fuelTypeDescription]);

  useEffect(() => {
    // Handle error case first
    if (state?.updateFuelTypeError?.updateFuelTypeErrorMessage) {
      toast.error(state.updateFuelTypeError.updateFuelTypeErrorMessage);
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
            revalidateTagName("update-fuel-type"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "fuel_type";

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
      handleCloseUpdateFuelType();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateFuelType]);

  const handleUpdateDescription = (updatedDescription: string): void => {
    setDescription(updatedDescription);
  };

  const isDirty = [description !== fuelTypeDescription].some(Boolean);

  return {
    handleUpdateDescription,
    description,
    formRef,
    isDirty,
  };
}

export { useDashboardUpdateFuelTypeForm };
