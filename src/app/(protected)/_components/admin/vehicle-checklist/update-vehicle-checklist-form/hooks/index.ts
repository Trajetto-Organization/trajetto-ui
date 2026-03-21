import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import type { VehicleChecklistProps } from "../../vehicle-checklist.types";
import type { UpdateVehicleChecklistFormState } from "../update-vehicle-checklist-form.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

interface UseUpdateVehicleChecklistFormProps {
  state: UpdateVehicleChecklistFormState | null;
  handleCloseUpdateChecklist: () => void;
  checklistData: VehicleChecklistProps;
  isUpdateChecklistOpen: boolean;
}

function useUpdateVehicleChecklistForm({
  state,
  handleCloseUpdateChecklist,
  checklistData,
  isUpdateChecklistOpen,
}: UseUpdateVehicleChecklistFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Extract values from nested objects (RAW data)
  const sanitizedBranchName = checklistData.branch?.corporate_reason || "";
  const sanitizedVehicleDescription = checklistData.vehicle?.description || "";

  const sanitizedDriverName = checklistData.driver?.name || "";

  // Step management
  const [currentStep, setCurrentStep] = useState<
    "select-branch" | "select-vehicle-driver" | "update-checklist"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: sanitizedBranchName ? checklistData.branchId || "" : "",
      searchBranchInputValue: sanitizedBranchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: sanitizedVehicleDescription
        ? checklistData.vehicleId || ""
        : "",
      searchVehicleInputValue: sanitizedVehicleDescription,
      vehicleLicensePlate: checklistData.vehicle?.license_plate || "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: sanitizedDriverName ? checklistData.driverId || "" : "",
      searchDriverInputValue: sanitizedDriverName,
      driverCnh: checklistData.driver?.cnh || "",
    });

  // Checklist form values callback state
  const [checklistFormValues, setChecklistFormValues] = useState<
    Record<string, any>
  >({});

  const handleFormValuesChange = useCallback((values: Record<string, any>) => {
    setChecklistFormValues(values);
  }, []);

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateChecklistOpen) {
      setCommandBranchInputValue({
        branchId: sanitizedBranchName ? checklistData.branchId || "" : "",
        searchBranchInputValue: sanitizedBranchName,
      });

      setCommandVehicleInputValue({
        vehicleId: sanitizedVehicleDescription
          ? checklistData.vehicleId || ""
          : "",
        searchVehicleInputValue: sanitizedVehicleDescription,
        vehicleLicensePlate: checklistData.vehicle?.license_plate || "",
      });

      setCommandDriverInputValue({
        driverId: sanitizedDriverName ? checklistData.driverId || "" : "",
        searchDriverInputValue: sanitizedDriverName,
        driverCnh: checklistData.driver?.cnh || "",
      });

      setCurrentStep("select-branch");
      setChecklistFormValues({});
    }
  }, [
    isUpdateChecklistOpen,
    sanitizedBranchName,
    sanitizedVehicleDescription,
    sanitizedDriverName,
    checklistData,
  ]);

  const handleUpdateSearchBranchInputValue = (
    data: CommandBranchInputValue,
  ) => {
    const updateBranchData =
      data.branchId === commandBranchInputValue.branchId
        ? { branchId: "", searchBranchInputValue: "" }
        : data;

    setCommandBranchInputValue(updateBranchData);
  };

  const handleUpdateSearchVehicleInputValue = (
    data: CommandVehicleInputValue,
  ) => {
    const updateVehicleData =
      data.vehicleId === commandVehicleInputValue.vehicleId
        ? {
            vehicleId: "",
            searchVehicleInputValue: "",
            vehicleLicensePlate: "",
          }
        : data;

    setCommandVehicleInputValue(updateVehicleData);
  };

  const handleUpdateSearchDriverInputValue = (
    data: CommandDriverInputValue,
  ) => {
    const updateDriverData =
      data.driverId === commandDriverInputValue.driverId
        ? {
            driverId: "",
            searchDriverInputValue: "",
            driverCnh: "",
          }
        : data;

    setCommandDriverInputValue(updateDriverData);
  };

  // Step navigation
  const handleBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("update-checklist");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
  };

  const handleBackToVehicleDriverStep = () => {
    setCurrentStep("select-vehicle-driver");
  };

  useEffect(() => {
    // Handle error case first
    if (
      state?.updateVehicleChecklistError?.updateVehicleChecklistErrorMessage
    ) {
      toast.error(
        state.updateVehicleChecklistError.updateVehicleChecklistErrorMessage,
      );
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
            revalidateTagName("update-vehicle-checklist"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "vehicle-checklist"
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

      // Close the modal immediately after showing toast
      handleCloseUpdateChecklist();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateChecklist]);

  const isEntityDirty = [
    commandBranchInputValue.branchId !== checklistData.branchId,
    commandVehicleInputValue.vehicleId !== checklistData.vehicleId,
    commandDriverInputValue.driverId !== checklistData.driverId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    isEntityDirty,
    checklistFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateVehicleChecklistForm };
