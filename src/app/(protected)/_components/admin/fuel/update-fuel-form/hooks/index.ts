import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
} from "@/app/(protected)/_components/dto";

import { FuelProps } from "../../dto";
import { UpdateFuelFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateFuelFormProps {
  state: UpdateFuelFormState | null;
  handleCloseUpdateFuel: () => void;
  fuelData: FuelProps;
  isUpdateFuelOpen: boolean;
}

function useUpdateFuelForm({
  state,
  handleCloseUpdateFuel,
  fuelData,
  isUpdateFuelOpen,
}: UseUpdateFuelFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Sanitize optional fields that might contain "N/A"
  const sanitizedBranchName =
    fuelData.branch_name && fuelData.branch_name !== "N/A"
      ? fuelData.branch_name
      : "";

  const sanitizedVehicleDescription =
    fuelData.vehicle_description && fuelData.vehicle_description !== "N/A"
      ? fuelData.vehicle_description
      : "";

  const sanitizedDriverName =
    fuelData.driver_name && fuelData.driver_name !== "N/A"
      ? fuelData.driver_name
      : "";

  const sanitizedFuelTypeDescription =
    fuelData.fuel_type_description && fuelData.fuel_type_description !== "N/A"
      ? fuelData.fuel_type_description
      : "";

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-business-branch"
    | "select-vehicle-driver"
    | "select-fuel-type"
    | "update-fuel"
  >("select-business-branch");

  // Initialize form values from fuel data with sanitized values
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: fuelData.businessId as string,
      searchBusinessInputValue: fuelData.business_name as string,
    });

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: sanitizedBranchName ? fuelData.branchId || "" : "",
      searchBranchInputValue: sanitizedBranchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: sanitizedVehicleDescription ? fuelData.vehicleId || "" : "",
      searchVehicleInputValue: sanitizedVehicleDescription,
      vehicleLicensePlate:
        sanitizedVehicleDescription && fuelData.vehicle_license_plate
          ? fuelData.vehicle_license_plate
          : "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: sanitizedDriverName ? fuelData.driverId || "" : "",
      searchDriverInputValue: sanitizedDriverName,
      driverCnh:
        sanitizedDriverName && fuelData.driver_cnh ? fuelData.driver_cnh : "",
    });

  const [commandFuelTypeInputValue, setCommandFuelTypeInputValue] =
    useState<CommandFuelTypeInputValue>({
      fuelTypeId: sanitizedFuelTypeDescription ? fuelData.fuelTypeId || "" : "",
      searchFuelTypeInputValue: sanitizedFuelTypeDescription,
    });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateFuelOpen) {
      setCommandBusinessInputValue({
        businessId: fuelData.businessId as string,
        searchBusinessInputValue: fuelData.business_name as string,
      });

      setCommandBranchInputValue({
        branchId: sanitizedBranchName ? fuelData.branchId || "" : "",
        searchBranchInputValue: sanitizedBranchName,
      });

      setCommandVehicleInputValue({
        vehicleId: sanitizedVehicleDescription ? fuelData.vehicleId || "" : "",
        searchVehicleInputValue: sanitizedVehicleDescription,
        vehicleLicensePlate:
          sanitizedVehicleDescription && fuelData.vehicle_license_plate
            ? fuelData.vehicle_license_plate
            : "",
      });

      setCommandDriverInputValue({
        driverId: sanitizedDriverName ? fuelData.driverId || "" : "",
        searchDriverInputValue: sanitizedDriverName,
        driverCnh:
          sanitizedDriverName && fuelData.driver_cnh ? fuelData.driver_cnh : "",
      });

      setCommandFuelTypeInputValue({
        fuelTypeId: sanitizedFuelTypeDescription
          ? fuelData.fuelTypeId || ""
          : "",
        searchFuelTypeInputValue: sanitizedFuelTypeDescription,
      });

      setCurrentStep("select-business-branch");
    }
  }, [
    isUpdateFuelOpen,
    sanitizedBranchName,
    sanitizedVehicleDescription,
    sanitizedDriverName,
    sanitizedFuelTypeDescription,
    fuelData,
  ]);

  // Handle business and branch selection updates
  const handleUpdateSearchBusinessInputValue = (
    data: CommandBusinessInputValue,
  ) => {
    const updateBusinessData =
      data.businessId === commandBusinessInputValue.businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : data;

    if (
      updateBusinessData.businessId !== commandBusinessInputValue.businessId
    ) {
      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });
      setCommandVehicleInputValue({
        vehicleId: "",
        searchVehicleInputValue: "",
        vehicleLicensePlate: "",
      });
      setCommandDriverInputValue({
        driverId: "",
        searchDriverInputValue: "",
        driverCnh: "",
      });
      setCommandFuelTypeInputValue({
        fuelTypeId: "",
        searchFuelTypeInputValue: "",
      });
    }

    setCommandBusinessInputValue(updateBusinessData);
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
  const handleBusinessBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("select-fuel-type");
  };

  const handleFuelTypeStepContinue = () => {
    setCurrentStep("update-fuel");
  };

  const handleBackToBusinessBranchStep = () => {
    setCurrentStep("select-business-branch");
  };

  const handleBackToVehicleDriverStep = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleBackToFuelTypeStep = () => {
    setCurrentStep("select-fuel-type");
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateFuelError?.updateFuelErrorMessage) {
      toast.error(state.updateFuelError.updateFuelErrorMessage);
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
            revalidateTagName("update-fuel"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) && query.queryKey[0] === "fuel"
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
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "previousFuel"
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
      handleCloseUpdateFuel();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateFuel]);

  // Create sanitized original values for comparison
  const originalBranchId =
    fuelData.branch_name !== "N/A" ? fuelData.branchId || "" : "";
  const originalVehicleId =
    fuelData.vehicle_description !== "N/A" ? fuelData.vehicleId || "" : "";
  const originalDriverId =
    fuelData.driver_name !== "N/A" ? fuelData.driverId || "" : "";
  const originalFuelTypeId =
    fuelData.fuel_type_description !== "N/A" ? fuelData.fuelTypeId || "" : "";

  const isBusinessAndEntityDirty = [
    commandBusinessInputValue.businessId !== fuelData.businessId,
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandDriverInputValue.driverId !== originalDriverId,
    commandFuelTypeInputValue.fuelTypeId !== originalFuelTypeId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBusinessAndEntityDirty,
  };
}

export { useUpdateFuelForm };
