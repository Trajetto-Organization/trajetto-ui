import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import type { DashboardCreateFuelFormState } from "../dashboard-create-fuel-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDashboardCreateFuelForm(
  state: DashboardCreateFuelFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateFuelForm, setIsCreateFuelForm] = useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-vehicle-driver"
    | "select-fuel-type"
    | "create-fuel"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: "",
      searchBranchInputValue: "",
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: "",
      searchVehicleInputValue: "",
      vehicleLicensePlate: "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: "",
      searchDriverInputValue: "",
      driverCnh: "",
    });

  const [commandFuelTypeInputValue, setCommandFuelTypeInputValue] =
    useState<CommandFuelTypeInputValue>({
      fuelTypeId: "",
      searchFuelTypeInputValue: "",
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

  useEffect(() => {
    if (!isCreateFuelForm) {
      toast.dismiss();
    }
  }, [isCreateFuelForm]);

  const handleOpenCreateFuelForm = () => {
    if (isCreateFuelForm) {
      formRef.current?.reset();

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

      setFuelFormValues({});
    }

    setIsCreateFuelForm(!isCreateFuelForm);
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

  const handleBusinessBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("select-fuel-type");
  };

  const handleFuelTypeStepContinue = () => {
    setCurrentStep("create-fuel");
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

  const handleCloseDialog = () => {
    handleOpenCreateFuelForm();
    setCurrentStep("select-branch");

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

    setFuelFormValues({});
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createFuelError?.createFuelErrorMessage) {
      toast.error(state.createFuelError.createFuelErrorMessage);
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
            revalidateTagName("create-fuel"),
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
      handleOpenCreateFuelForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateFuelForm,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    formRef,
    fuelFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardCreateFuelForm };
