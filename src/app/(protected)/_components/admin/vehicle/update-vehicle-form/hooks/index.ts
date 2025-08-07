import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/dto";

import { VehicleProps } from "../../dto";
import { UpdateVehicleFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateVehicleFormProps {
  state: UpdateVehicleFormState | null;
  handleCloseUpdateVehicle: () => void;
  vehicleData: VehicleProps;
  isUpdateVehicleOpen: boolean;
}

function useUpdateVehicleForm({
  state,
  handleCloseUpdateVehicle,
  vehicleData,
  isUpdateVehicleOpen,
}: UseUpdateVehicleFormProps) {
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
    | "select-business"
    | "select-driver-vehicle-type"
    | "select-fuel-type"
    | "update-vehicle"
  >("select-business");

  // Initialize form values from vehicle data with sanitized values
  const [commandBusinnessInputValue, setCommandBusinnessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: vehicleData.businessId as string,
      searchBusinessInputValue: vehicleData.business_name as string,
    });

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
      setCommandBusinnessInputValue({
        businessId: vehicleData.businessId as string,
        searchBusinessInputValue: vehicleData.business_name as string,
      });

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

      setCurrentStep("select-business");
    }
  }, [
    isUpdateVehicleOpen,
    sanitizedBranchName,
    sanitizedDriverName,
    sanitizedVehicleTypeDescription,
    vehicleData,
  ]);

  // Handle business and branch selection updates
  const handleUpdateSearchBusinnessInputValue = (
    data: CommandBusinessInputValue,
  ) => {
    const updateBusinessData =
      data.businessId === commandBusinnessInputValue.businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : data;

    if (
      updateBusinessData.businessId !== commandBusinnessInputValue.businessId
    ) {
      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });
      setCommandDriverInputValue({
        driverId: "",
        searchDriverInputValue: "",
        driverCnh: "",
      });
      setCommandVehicleTypeInputValue({
        vehicleTypeId: "",
        searchVehicleTypeInputValue: "",
      });
      setCommandFuelTypeInputValue({
        fuelTypeId: "",
        searchFuelTypeInputValue: "",
      });
    }

    setCommandBusinnessInputValue(updateBusinessData);
  };

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

  const handleBackToBusinessStep = () => {
    setCurrentStep("select-business");
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

  const isBusinessAndBranchDirty = [
    commandBusinnessInputValue.businessId !== vehicleData.businessId,
    commandBranchInputValue.branchId !== originalBranchId,
    commandDriverInputValue.driverId !== originalDriverId,
    commandVehicleTypeInputValue.vehicleTypeId !== originalVehicleTypeId,
    commandFuelTypeInputValue.fuelTypeId !== vehicleData.fuelTypeId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBusinnessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBusinessAndBranchDirty,
  };
}

export { useUpdateVehicleForm };
