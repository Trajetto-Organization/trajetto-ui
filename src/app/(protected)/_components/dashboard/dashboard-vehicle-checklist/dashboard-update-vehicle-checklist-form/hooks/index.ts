import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardVehicleChecklistProps } from "../../dto";
import { DashboardUpdateVehicleChecklistFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateVehicleChecklistFormProps {
  state: DashboardUpdateVehicleChecklistFormState | null;
  handleCloseUpdateChecklist: () => void;
  checklistData: DashboardVehicleChecklistProps;
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

  // Sanitize optional fields that might contain "N/A"
  const sanitizedBranchName =
    checklistData.branch_name && checklistData.branch_name !== "N/A"
      ? checklistData.branch_name
      : "";

  const sanitizedVehicleDescription =
    checklistData.vehicle_description &&
    checklistData.vehicle_description !== "N/A"
      ? checklistData.vehicle_description
      : "";

  const sanitizedDriverName =
    checklistData.driver_name && checklistData.driver_name !== "N/A"
      ? checklistData.driver_name
      : "";

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
      vehicleLicensePlate:
        sanitizedVehicleDescription && checklistData.vehicle_license_plate
          ? checklistData.vehicle_license_plate
          : "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: sanitizedDriverName ? checklistData.driverId || "" : "",
      searchDriverInputValue: sanitizedDriverName,
      driverCnh:
        sanitizedDriverName && checklistData.driver_cnh
          ? checklistData.driver_cnh
          : "",
    });

  // Reset form values when dialog closes or checklist changes
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
        vehicleLicensePlate:
          sanitizedVehicleDescription && checklistData.vehicle_license_plate
            ? checklistData.vehicle_license_plate
            : "",
      });

      setCommandDriverInputValue({
        driverId: sanitizedDriverName ? checklistData.driverId || "" : "",
        searchDriverInputValue: sanitizedDriverName,
        driverCnh:
          sanitizedDriverName && checklistData.driver_cnh
            ? checklistData.driver_cnh
            : "",
      });

      setCurrentStep("select-branch");
    }
  }, [isUpdateChecklistOpen, checklistData.id]);

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

  // Create sanitized original values for comparison
  const originalBranchId =
    checklistData.branch_name !== "N/A" ? checklistData.branchId || "" : "";
  const originalVehicleId =
    checklistData.vehicle_description !== "N/A"
      ? checklistData.vehicleId || ""
      : "";
  const originalDriverId =
    checklistData.driver_name !== "N/A" ? checklistData.driverId || "" : "";

  const isEntityDirty = [
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandDriverInputValue.driverId !== originalDriverId,
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
  };
}

export { useUpdateVehicleChecklistForm };
