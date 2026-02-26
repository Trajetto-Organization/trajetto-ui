import { useCallback, useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardCreateVehicleChecklistFormState } from "../dto";
import { toast } from "sonner";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

const useDashboardCreateVehicleChecklistForm = (
  state: DashboardCreateVehicleChecklistFormState | null,
) => {
  const [isCreateVehicleChecklistForm, setIsCreateVehicleChecklistForm] =
    useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const toastShownRef = useRef(false);

  const [currentStep, setCurrentStep] = useState<
    "select-branch" | "select-vehicle-driver" | "create-checklist"
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

  // Checklist form values callback state
  const [checklistFormValues, setChecklistFormValues] = useState<
    Record<string, any>
  >({});

  const handleFormValuesChange = useCallback((values: Record<string, any>) => {
    setChecklistFormValues(values);
  }, []);

  useEffect(() => {
    if (!isCreateVehicleChecklistForm) {
      toast.dismiss();
    }
  }, [isCreateVehicleChecklistForm]);

  const handleOpenCreateVehicleChecklistForm = () => {
    if (isCreateVehicleChecklistForm) {
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

      setChecklistFormValues({});
    }

    setIsCreateVehicleChecklistForm(!isCreateVehicleChecklistForm);
  };

  const handleCloseDialog = () => {
    handleOpenCreateVehicleChecklistForm();
    setCurrentStep("select-branch");

    // Reset all form values
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

    setChecklistFormValues({});
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

  const handleBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("create-checklist");
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
      state?.createVehicleChecklistError?.createVehicleChecklistErrorMessage
    ) {
      toast.error(
        state.createVehicleChecklistError.createVehicleChecklistErrorMessage,
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
            revalidateTagName("create-vehicle-checklist"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "vehicle_checklist"
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
      handleOpenCreateVehicleChecklistForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateVehicleChecklistForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    checklistFormValues,
    handleFormValuesChange,
  };
};

export { useDashboardCreateVehicleChecklistForm };
