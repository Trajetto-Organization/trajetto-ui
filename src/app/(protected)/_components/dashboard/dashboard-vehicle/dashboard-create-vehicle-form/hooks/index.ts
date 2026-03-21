import { useEffect, useRef, useState, useCallback } from "react";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import type { DashboardCreateVehicleFormState } from "../dashboard-create-vehicle-form.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

function useDashboardCreateVehicleForm(
  state: DashboardCreateVehicleFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateVehicleForm, setIsCreateVehicleForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-driver-vehicle-type"
    | "select-fuel-type"
    | "create-vehicle"
  >("select-branch");

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

  useEffect(() => {
    if (!isCreateVehicleForm) {
      toast.dismiss();
    }
  }, [isCreateVehicleForm]);

  const handleOpenCreateVehicleForm = () => {
    if (isCreateVehicleForm) {
      formRef.current?.reset();

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

      setVehicleFormValues({});
    }

    setIsCreateVehicleForm(!isCreateVehicleForm);
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

  const handleBranchStepContinue = () => {
    setCurrentStep("select-driver-vehicle-type");
  };

  const handleDriverVehicleTypeStepContinue = () => {
    setCurrentStep("select-fuel-type");
  };

  const handleFuelTypeStepContinue = () => {
    setCurrentStep("create-vehicle");
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

  const handleCloseDialog = () => {
    handleOpenCreateVehicleForm();
    setCurrentStep("select-branch");

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

    setVehicleFormValues({});
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
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBranchStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    formRef,
    vehicleFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardCreateVehicleForm };
