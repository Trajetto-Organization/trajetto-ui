import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import type { DashboardCreateFineFormState } from "../dashboard-create-fine-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDashboardCreateFineForm(
  state: DashboardCreateFineFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateFineForm, setIsCreateFineForm] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-vehicle-driver"
    | "select-violation-code"
    | "create-fine"
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

  const [
    commandTrafficViolationCodeInputValue,
    setCommandTrafficViolationCodeInputValue,
  ] = useState<CommandTrafficViolationCodeInputValue>({
    trafficViolationCodeId: "",
    searchTrafficViolationCodeInputValue: "",
  });

  // Form values state with callback pattern
  const [fineFormValues, setFineFormValues] = useState<Record<string, string>>(
    {},
  );

  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setFineFormValues(values);
    },
    [],
  );

  useEffect(() => {
    if (!isCreateFineForm) {
      toast.dismiss();
    }
  }, [isCreateFineForm]);

  const handleOpenCreateFineForm = () => {
    if (isCreateFineForm) {
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

      setCommandTrafficViolationCodeInputValue({
        trafficViolationCodeId: "",
        searchTrafficViolationCodeInputValue: "",
      });

      // Reset form values
      setFineFormValues({});
    }

    setIsCreateFineForm(!isCreateFineForm);
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
        ? { driverId: "", searchDriverInputValue: "", driverCnh: "" }
        : data;

    setCommandDriverInputValue(updateDriverData);
  };

  const handleUpdateSearchTrafficViolationCodeInputValue = (
    data: CommandTrafficViolationCodeInputValue,
  ) => {
    const updateTrafficViolationCodeData =
      data.trafficViolationCodeId ===
      commandTrafficViolationCodeInputValue.trafficViolationCodeId
        ? {
            trafficViolationCodeId: "",
            searchTrafficViolationCodeInputValue: "",
          }
        : data;

    setCommandTrafficViolationCodeInputValue(updateTrafficViolationCodeData);
  };

  const handleBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("select-violation-code");
  };

  const handleViolationCodeStepContinue = () => {
    setCurrentStep("create-fine");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
  };

  const handleBackToVehicleDriverStep = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleBackToViolationCodeStep = () => {
    setCurrentStep("select-violation-code");
  };

  const handleCloseDialog = () => {
    handleOpenCreateFineForm();
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

    setCommandTrafficViolationCodeInputValue({
      trafficViolationCodeId: "",
      searchTrafficViolationCodeInputValue: "",
    });
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createFineError?.createFineErrorMessage) {
      toast.error(state.createFineError.createFineErrorMessage);
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
            revalidateTagName("create-fine"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) && query.queryKey[0] === "fine"
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
      handleOpenCreateFineForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateFineForm,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchTrafficViolationCodeInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleViolationCodeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToViolationCodeStep,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandTrafficViolationCodeInputValue,
    formRef,
    fineFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardCreateFineForm };
