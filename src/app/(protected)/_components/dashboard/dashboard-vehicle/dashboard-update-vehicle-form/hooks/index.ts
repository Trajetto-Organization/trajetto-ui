import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardVehicleProps } from "../../dto";
import { DashboardUpdateVehicleFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseDashboardUpdateVehicleFormProps {
  state: DashboardUpdateVehicleFormState | null;
  handleCloseUpdateVehicle: () => void;
  vehicleData: DashboardVehicleProps;
  isUpdateVehicleOpen: boolean;
}

function useDashboardUpdateVehicleForm({
  state,
  handleCloseUpdateVehicle,
  vehicleData,
  isUpdateVehicleOpen,
}: UseDashboardUpdateVehicleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Sanitize optional fields that might contain "N/A"
  const sanitizedBranchName =
    vehicleData.branchName && vehicleData.branchName !== "N/A"
      ? vehicleData.branchName
      : "";

  const sanitizedDriverName =
    vehicleData.driverName && vehicleData.driverName !== "N/A"
      ? vehicleData.driverName
      : "";

  const sanitizedVehicleTypeDescription =
    vehicleData.vehicleTypeDescription &&
    vehicleData.vehicleTypeDescription !== "N/A"
      ? vehicleData.vehicleTypeDescription
      : "";

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-driver-vehicle-type"
    | "select-fuel-type"
    | "update-vehicle"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: sanitizedBranchName ? vehicleData.branchId || "" : "",
      searchBranchInputValue: sanitizedBranchName,
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: sanitizedDriverName ? vehicleData.driverId || "" : "",
      searchDriverInputValue: sanitizedDriverName,
      driverCnh:
        sanitizedDriverName && vehicleData.driverCnh
          ? vehicleData.driverCnh.slice(-4)
          : "",
    });

  const [commandVehicleTypeInputValue, setCommandVehicleTypeInputValue] =
    useState<CommandVehicleTypeInputValue>({
      vehicleTypeId: sanitizedVehicleTypeDescription
        ? vehicleData.vehicleTypeId || ""
        : "",
      searchVehicleTypeInputValue: sanitizedVehicleTypeDescription,
    });

  const [commandFuelTypeInputValue, setCommandFuelTypeInputValue] =
    useState<CommandFuelTypeInputValue>({
      fuelTypeId: vehicleData.fuelTypeId,
      searchFuelTypeInputValue: vehicleData.fuelTypeDescription,
    });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateVehicleOpen) {
      setCommandBranchInputValue({
        branchId: sanitizedBranchName ? vehicleData.branchId || "" : "",
        searchBranchInputValue: sanitizedBranchName,
      });

      setCommandDriverInputValue({
        driverId: sanitizedDriverName ? vehicleData.driverId || "" : "",
        searchDriverInputValue: sanitizedDriverName,
        driverCnh:
          sanitizedDriverName && vehicleData.driverCnh
            ? vehicleData.driverCnh.slice(-4)
            : "",
      });

      setCommandVehicleTypeInputValue({
        vehicleTypeId: sanitizedVehicleTypeDescription
          ? vehicleData.vehicleTypeId || ""
          : "",
        searchVehicleTypeInputValue: sanitizedVehicleTypeDescription,
      });

      setCommandFuelTypeInputValue({
        fuelTypeId: vehicleData.fuelTypeId,
        searchFuelTypeInputValue: vehicleData.fuelTypeDescription,
      });

      setCurrentStep("select-branch");
    }
  }, [
    isUpdateVehicleOpen,
    sanitizedBranchName,
    sanitizedDriverName,
    sanitizedVehicleTypeDescription,
    vehicleData,
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

  const handleUpdateSearchDriverInputValue = (
    data: CommandDriverInputValue,
  ) => {
    const updateDriverData =
      data.driverId === commandDriverInputValue.driverId
        ? { driverId: "", searchDriverInputValue: "", driverCnh: "" }
        : data;

    setCommandDriverInputValue(updateDriverData);
  };

  const handleUpdateSearchVehicleTypeInputValue = (
    data: CommandVehicleTypeInputValue,
  ) => {
    const updateVehicleTypeData =
      data.vehicleTypeId === commandVehicleTypeInputValue.vehicleTypeId
        ? { vehicleTypeId: "", searchVehicleTypeInputValue: "" }
        : data;

    setCommandVehicleTypeInputValue(updateVehicleTypeData);
  };

  const handleUpdateSearchFuelTypeInputValue = (
    data: CommandFuelTypeInputValue,
  ) => {
    const updateFuelTypeData =
      data.fuelTypeId === commandFuelTypeInputValue.fuelTypeId
        ? { fuelTypeId: "", searchFuelTypeInputValue: "" }
        : data;

    setCommandFuelTypeInputValue(updateFuelTypeData);
  };

  // Step navigation
  const handleBusinessStepContinue = () => {
    setCurrentStep("select-driver-vehicle-type");
  };

  const handleDriverVehicleTypeStepContinue = () => {
    setCurrentStep("select-fuel-type");
  };

  const handleFuelTypeStepContinue = () => {
    setCurrentStep("update-vehicle");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
  };

  const handleBackToDriverVehicleTypeStep = () => {
    setCurrentStep("select-driver-vehicle-type");
  };

  const handleBackToFuelTypeStep = () => {
    setCurrentStep("select-fuel-type");
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateVehicleError?.updateVehicleErrorMessage) {
      toast.error(state.updateVehicleError.updateVehicleErrorMessage);
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
            revalidateTagName("update-vehicle"),
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

      // Close the modal immediately after showing toast
      handleCloseUpdateVehicle();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateVehicle]);

  // Create sanitized original values for comparison
  const originalBranchId =
    vehicleData.branchName !== "N/A" ? vehicleData.branchId || "" : "";
  const originalDriverId =
    vehicleData.driverName !== "N/A" ? vehicleData.driverId || "" : "";
  const originalVehicleTypeId =
    vehicleData.vehicleTypeDescription !== "N/A"
      ? vehicleData.vehicleTypeId || ""
      : "";

  const isBranchDirty = [
    commandBranchInputValue.branchId !== originalBranchId,
    commandDriverInputValue.driverId !== originalDriverId,
    commandVehicleTypeInputValue.vehicleTypeId !== originalVehicleTypeId,
    commandFuelTypeInputValue.fuelTypeId !== vehicleData.fuelTypeId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBranchDirty,
  };
}

export { useDashboardUpdateVehicleForm };
