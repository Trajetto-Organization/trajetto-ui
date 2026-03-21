import { useEffect, useRef, useState } from "react";
import type { CommandBusinessInputValue } from "@/app/(protected)/_components/shared/common.types";

import type { UpdateVehicleTypeFormState } from "../update-vehicle-type-form.types";
import type { VehicleTypeProps } from "../../vehicle-type.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

interface UseUpdateVehicleTypeFormProps {
  state: UpdateVehicleTypeFormState | null;
  handleCloseUpdateVehicleType: () => void;
  vehicleTypeValues: VehicleTypeProps;
  isUpdateVehicleTypeOpen: boolean;
}

function useUpdateVehicleTypeForm({
  state,
  handleCloseUpdateVehicleType,
  isUpdateVehicleTypeOpen,
  vehicleTypeValues: {
    number_of_axles: vehicleNumberOfAxles,
    description: vehicleTypeDescription,
    businessId: vehicleTypeBusiness,
    business: businessName,
  },
}: UseUpdateVehicleTypeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [numberOfAxles, setNumberOfAxles] =
    useState<number>(vehicleNumberOfAxles);

  const [description, setDescription] = useState<string>(
    vehicleTypeDescription,
  );
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: vehicleTypeBusiness || "",
      searchBusinessInputValue: businessName?.corporate_reason || "",
    });

  useEffect(() => {
    if (!isUpdateVehicleTypeOpen) {
      setNumberOfAxles(vehicleNumberOfAxles);
      setDescription(vehicleTypeDescription);

      setCommandBusinessInputValue({
        businessId: vehicleTypeBusiness || "",
        searchBusinessInputValue: businessName?.corporate_reason || "",
      });
    }
  }, [
    isUpdateVehicleTypeOpen,
    vehicleNumberOfAxles,
    vehicleTypeDescription,
    vehicleTypeBusiness,
    businessName,
  ]);

  useEffect(() => {
    // Handle error case first
    if (state?.updateVehicleTypeError?.updateVehicleTypeErrorMessage) {
      toast.error(state.updateVehicleTypeError.updateVehicleTypeErrorMessage);
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
            revalidateTagName("update-vehicle-type"),
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
      handleCloseUpdateVehicleType();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateVehicleType]);

  const handleUpdateDescription = (updatedDescription: string): void => {
    setDescription(updatedDescription);
  };

  const handleUpdateNumberOfAxles = (updatedNumberOfAxles: string): void => {
    setNumberOfAxles(parseInt(updatedNumberOfAxles));
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
    description !== vehicleTypeDescription,
    numberOfAxles !== vehicleNumberOfAxles,
    commandBusinessInputValue.businessId !== vehicleTypeBusiness,
  ].some(Boolean);

  return {
    handleUpdateDescription,
    handleUpdateNumberOfAxles,
    numberOfAxles,
    description,
    formRef,
    isDirty,
    commandBusinessInputValue,
    handleUpdateSearchBusinessInputValue,
  };
}

export { useUpdateVehicleTypeForm };
