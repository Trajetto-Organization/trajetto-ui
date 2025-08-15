import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
  CreateVehicleFormState,
} from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useCreateVehicleForm(state: CreateVehicleFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateVehicleForm, setIsCreateVehicleForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-business"
    | "select-driver-vehicle-type"
    | "select-fuel-type"
    | "create-vehicle"
  >("select-business");

  const [commandBusinnessInputValue, setCommandBusinnessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: "",
      searchBusinessInputValue: "",
    });

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: "",
      searchBranchInputValue: "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: "",
      searchDriverInputValue: "",
      driverCnh: "",
    });

  const [commandVehicleTypeInputValue, setCommandVehicleTypeInputValue] =
    useState<CommandVehicleTypeInputValue>({
      vehicleTypeId: "",
      searchVehicleTypeInputValue: "",
    });

  const [commandFuelTypeInputValue, setCommandFuelTypeInputValue] =
    useState<CommandFuelTypeInputValue>({
      fuelTypeId: "",
      searchFuelTypeInputValue: "",
    });

  useEffect(() => {
    if (!isCreateVehicleForm) {
      toast.dismiss();
    }
  }, [isCreateVehicleForm]);

  const handleOpenCreateVehicleForm = () => {
    if (isCreateVehicleForm) {
      formRef.current?.reset();

      setCommandBusinnessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });

      setCommandDriverInputValue({
        driverId: "",
        searchDriverInputValue: "",
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

    setIsCreateVehicleForm(!isCreateVehicleForm);
  };

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

  const handleBusinessStepContinue = () => {
    setCurrentStep("select-driver-vehicle-type");
  };

  const handleDriverVehicleTypeStepContinue = () => {
    setCurrentStep("select-fuel-type");
  };

  const handleFuelTypeStepContinue = () => {
    setCurrentStep("create-vehicle");
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

  const handleCloseDialog = () => {
    handleOpenCreateVehicleForm();
    setCurrentStep("select-business");

    // Reset all form values
    setCommandBusinnessInputValue({
      businessId: "",
      searchBusinessInputValue: "",
    });

    setCommandBranchInputValue({
      branchId: "",
      searchBranchInputValue: "",
    });

    setCommandDriverInputValue({
      driverId: "",
      searchDriverInputValue: "",
    });

    setCommandVehicleTypeInputValue({
      vehicleTypeId: "",
      searchVehicleTypeInputValue: "",
    });

    setCommandFuelTypeInputValue({
      fuelTypeId: "",
      searchFuelTypeInputValue: "",
    });
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createVehicleError?.createVehicleErrorMessage) {
      toast.error(state.createVehicleError.createVehicleErrorMessage);
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
            revalidateTagName("create-vehicle"),
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
      handleOpenCreateVehicleForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateVehicleForm,
    handleUpdateSearchBusinnessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleCloseDialog,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    formRef,
  };
}

export { useCreateVehicleForm };
