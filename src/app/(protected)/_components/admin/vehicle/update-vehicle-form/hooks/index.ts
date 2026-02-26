import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  CommandBranchInputValue,
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

  const branchName = useMemo(
    () => vehicleData.branch?.corporate_reason || "",
    [vehicleData.branch?.corporate_reason],
  );

  const driverName = useMemo(
    () => vehicleData.driver?.name || "",
    [vehicleData.driver?.name],
  );

  const driverCnh = useMemo(
    () => vehicleData.driver?.cnh || "",
    [vehicleData.driver?.cnh],
  );

  const vehicleTypeDescription = useMemo(
    () => vehicleData.vehicleType?.description || "",
    [vehicleData.vehicleType?.description],
  );

  const fuelTypeDescription = useMemo(
    () => vehicleData.fuelType?.description || "",
    [vehicleData.fuelType?.description],
  );

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-driver-vehicle-type"
    | "select-fuel-type"
    | "update-vehicle"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: branchName ? vehicleData.branchId || "" : "",
      searchBranchInputValue: branchName,
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: driverName ? vehicleData.driverId || "" : "",
      searchDriverInputValue: driverName,
      driverCnh: driverCnh ? driverCnh.slice(-4) : "",
    });

  const [commandVehicleTypeInputValue, setCommandVehicleTypeInputValue] =
    useState<CommandVehicleTypeInputValue>({
      vehicleTypeId: vehicleTypeDescription
        ? vehicleData.vehicleTypeId || ""
        : "",
      searchVehicleTypeInputValue: vehicleTypeDescription,
    });

  const [commandFuelTypeInputValue, setCommandFuelTypeInputValue] =
    useState<CommandFuelTypeInputValue>({
      fuelTypeId: vehicleData.fuelTypeId,
      searchFuelTypeInputValue: fuelTypeDescription,
    });

  // Persisted form values for the last step
  const [vehicleFormValues, setVehicleFormValues] = useState<
    Record<string, string>
  >({});

  // Callback to update form values from child component
  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setVehicleFormValues(values);
    },
    [],
  );

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateVehicleOpen) {
      setCommandBranchInputValue({
        branchId: branchName ? vehicleData.branchId || "" : "",
        searchBranchInputValue: branchName,
      });

      setCommandDriverInputValue({
        driverId: driverName ? vehicleData.driverId || "" : "",
        searchDriverInputValue: driverName,
        driverCnh: driverCnh ? driverCnh.slice(-4) : "",
      });

      setCommandVehicleTypeInputValue({
        vehicleTypeId: vehicleTypeDescription
          ? vehicleData.vehicleTypeId || ""
          : "",
        searchVehicleTypeInputValue: vehicleTypeDescription,
      });

      setCommandFuelTypeInputValue({
        fuelTypeId: vehicleData.fuelTypeId,
        searchFuelTypeInputValue: fuelTypeDescription,
      });

      setVehicleFormValues({});
      setCurrentStep("select-branch");
    }
  }, [
    isUpdateVehicleOpen,
    branchName,
    driverName,
    driverCnh,
    vehicleTypeDescription,
    fuelTypeDescription,
    vehicleData.businessId,
    vehicleData.branchId,
    vehicleData.driverId,
    vehicleData.vehicleTypeId,
    vehicleData.fuelTypeId,
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
  const handleBranchStepContinue = () => {
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
      handleCloseUpdateVehicle();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateVehicle]);

  // Compare current values with original values from vehicle data
  const originalBranchId = vehicleData.branchId || "";
  const originalDriverId = vehicleData.driverId || "";

  const originalVehicleTypeId = vehicleData.vehicleTypeId || "";

  const isEntityDirty = [
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
    handleBranchStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isEntityDirty,
    vehicleFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateVehicleForm };
