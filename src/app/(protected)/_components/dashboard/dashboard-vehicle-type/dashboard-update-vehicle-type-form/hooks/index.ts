import { useEffect, useRef, useState } from "react";

import { DashboardUpdateVehicleTypeFormState } from "../dto";
import { DashboardVehicleTypeProps } from "../../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateVehicleTypeFormProps {
  state: DashboardUpdateVehicleTypeFormState | null;
  handleCloseUpdateVehicleType: () => void;
  vehicleTypeValues: DashboardVehicleTypeProps;
  isUpdateVehicleTypeOpen: boolean;
}

function useDashboardUpdateVehicleTypeForm({
  state,
  handleCloseUpdateVehicleType,
  isUpdateVehicleTypeOpen,
  vehicleTypeValues: {
    number_of_axles: vehicleNumberOfAxles,
    description: vehicleTypeDescription,
  },
}: UseUpdateVehicleTypeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [numberOfAxles, setNumberOfAxles] =
    useState<number>(vehicleNumberOfAxles);
  const [description, setDescription] = useState<string>(
    vehicleTypeDescription,
  );

  useEffect(() => {
    if (!isUpdateVehicleTypeOpen) {
      setNumberOfAxles(vehicleNumberOfAxles);
      setDescription(vehicleTypeDescription);
    }
  }, [isUpdateVehicleTypeOpen, vehicleNumberOfAxles, vehicleTypeDescription]);

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

  const isDirty = [
    description !== vehicleTypeDescription,
    numberOfAxles !== vehicleNumberOfAxles,
  ].some(Boolean);

  return {
    handleUpdateDescription,
    handleUpdateNumberOfAxles,
    numberOfAxles,
    description,
    formRef,
    isDirty,
  };
}

export { useDashboardUpdateVehicleTypeForm };
