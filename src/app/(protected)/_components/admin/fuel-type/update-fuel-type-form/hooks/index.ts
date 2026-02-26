import { useEffect, useRef, useState } from "react";
import { CommandBusinessInputValue } from "../../../../dto";

import { UpdateFuelTypeFormState } from "../dto";
import { FuelTypeProps } from "../../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateFuelTypeFormProps {
  state: UpdateFuelTypeFormState | null;
  handleCloseUpdateFuelType: () => void;
  fuelTypeValues: FuelTypeProps;
  isUpdateFuelTypeOpen: boolean;
}

function useUpdateFuelTypeForm({
  state,
  handleCloseUpdateFuelType,
  isUpdateFuelTypeOpen,
  fuelTypeValues: {
    description: fuelTypeDescription,
    businessId: fuelTypeBusiness,
    business: businessName,
  },
}: UseUpdateFuelTypeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [description, setDescription] = useState<string>(fuelTypeDescription);
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: fuelTypeBusiness || "",
      searchBusinessInputValue: businessName?.corporate_reason || "",
    });

  useEffect(() => {
    if (!isUpdateFuelTypeOpen) {
      setDescription(fuelTypeDescription);
      setCommandBusinessInputValue({
        businessId: fuelTypeBusiness || "",
        searchBusinessInputValue: businessName?.corporate_reason || "",
      });
    }
  }, [
    isUpdateFuelTypeOpen,
    fuelTypeDescription,
    fuelTypeBusiness,
    businessName,
  ]);

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

  const handleUpdateSearchBusinessInputValue = (
    data: CommandBusinessInputValue,
  ): void => {
    const updateBusinessData =
      data.businessId === commandBusinessInputValue.businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : data;

    setCommandBusinessInputValue(updateBusinessData);
  };

  const isDirty = [
    description !== fuelTypeDescription,
    commandBusinessInputValue.businessId !== fuelTypeBusiness,
  ].some(Boolean);

  return {
    handleUpdateDescription,
    description,
    formRef,
    isDirty,
    commandBusinessInputValue,
    handleUpdateSearchBusinessInputValue,
  };
}

export { useUpdateFuelTypeForm };
