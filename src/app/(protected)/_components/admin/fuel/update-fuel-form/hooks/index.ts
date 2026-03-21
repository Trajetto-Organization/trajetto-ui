import { useCallback, useEffect, useRef, useState, useMemo } from "react";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
  FuelProps,
} from "@/app/(protected)/_components/shared/common.types";
import type { UpdateFuelFormState } from "../update-fuel-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

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

  const branchName = useMemo(
    () => fuelData.branch?.corporate_reason || "",
    [fuelData.branch?.corporate_reason],
  );

  const vehicleDescription = useMemo(
    () => fuelData.vehicle?.description || "",
    [fuelData.vehicle?.description],
  );

  const driverName = useMemo(
    () => fuelData.driver?.name || "",
    [fuelData.driver?.name],
  );

  const fuelTypeDescription = useMemo(
    () => fuelData.fuelType?.description || "",
    [fuelData.fuelType?.description],
  );

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-vehicle-driver"
    | "select-fuel-type"
    | "update-fuel"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: branchName ? fuelData.branchId || "" : "",
      searchBranchInputValue: branchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: vehicleDescription ? fuelData.vehicleId || "" : "",
      searchVehicleInputValue: vehicleDescription,
      vehicleLicensePlate: fuelData.vehicle?.license_plate || "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: driverName ? fuelData.driverId || "" : "",
      searchDriverInputValue: driverName,
      driverCnh: fuelData.driver?.cnh || "",
    });

  const [commandFuelTypeInputValue, setCommandFuelTypeInputValue] =
    useState<CommandFuelTypeInputValue>({
      fuelTypeId: fuelTypeDescription ? fuelData.fuelTypeId || "" : "",
      searchFuelTypeInputValue: fuelTypeDescription,
    });

  // Form values state with callback pattern
  const [fuelFormValues, setFuelFormValues] = useState<Record<string, string>>(
    {},
  );

  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setFuelFormValues(values);
    },
    [],
  );

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateFuelOpen) {
      setCommandBranchInputValue({
        branchId: branchName ? fuelData.branchId || "" : "",
        searchBranchInputValue: branchName,
      });

      setCommandVehicleInputValue({
        vehicleId: vehicleDescription ? fuelData.vehicleId || "" : "",
        searchVehicleInputValue: vehicleDescription,
        vehicleLicensePlate: fuelData.vehicle?.license_plate || "",
      });

      setCommandDriverInputValue({
        driverId: driverName ? fuelData.driverId || "" : "",
        searchDriverInputValue: driverName,
        driverCnh: fuelData.driver?.cnh || "",
      });

      setCommandFuelTypeInputValue({
        fuelTypeId: fuelTypeDescription ? fuelData.fuelTypeId || "" : "",
        searchFuelTypeInputValue: fuelTypeDescription,
      });

      setCurrentStep("select-branch");

      // Reset form values
      setFuelFormValues({});
    }
  }, [
    isUpdateFuelOpen,
    branchName,
    vehicleDescription,
    driverName,
    fuelTypeDescription,
    fuelData,
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
  const handleBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("select-fuel-type");
  };

  const handleFuelTypeStepContinue = () => {
    setCurrentStep("update-fuel");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
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

  // Create original values for comparison (from nested objects)
  const originalBranchId = fuelData.branch?.corporate_reason
    ? fuelData.branchId || ""
    : "";
  const originalVehicleId = fuelData.vehicle?.description
    ? fuelData.vehicleId || ""
    : "";

  const originalDriverId = fuelData.driver?.name ? fuelData.driverId || "" : "";
  const originalFuelTypeId = fuelData.fuelType?.description
    ? fuelData.fuelTypeId || ""
    : "";

  const isEntityDirty = [
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandDriverInputValue.driverId !== originalDriverId,
    commandFuelTypeInputValue.fuelTypeId !== originalFuelTypeId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isEntityDirty,
    fuelFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateFuelForm };
