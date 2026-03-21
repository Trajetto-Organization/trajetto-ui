import { useEffect, useRef, useState, useCallback } from "react";

import type {
  CommandBranchInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import type { DashboardCreateServiceOrderFormState } from "../dashboard-create-service-order-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDashboardCreateServiceOrderForm(
  state: DashboardCreateServiceOrderFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateServiceOrderForm, setIsCreateServiceOrderForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-vehicle-supplier"
    | "select-user"
    | "create-service-order"
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

  const [commandSupplierInputValue, setCommandSupplierInputValue] =
    useState<CommandSupplierInputValue>({
      supplierId: "",
      searchSupplierInputValue: "",
    });

  const [commandUserInputValue, setCommandUserInputValue] =
    useState<CommandUserInputValue>({
      userId: "",
      searchUserInputValue: "",
      responsibleUserEmail: "",
    });

  // Persisted form values for the last step
  const [serviceOrderFormValues, setServiceOrderFormValues] = useState<
    Record<string, string>
  >({});

  // Callback to update form values from child component
  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setServiceOrderFormValues(values);
    },
    [],
  );

  useEffect(() => {
    if (!isCreateServiceOrderForm) {
      toast.dismiss();
    }
  }, [isCreateServiceOrderForm]);

  const handleOpenCreateServiceOrderForm = () => {
    if (isCreateServiceOrderForm) {
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

      setCommandSupplierInputValue({
        supplierId: "",
        searchSupplierInputValue: "",
      });

      setCommandUserInputValue({
        userId: "",
        searchUserInputValue: "",
        responsibleUserEmail: "",
      });

      setServiceOrderFormValues({});
    }

    setIsCreateServiceOrderForm(!isCreateServiceOrderForm);
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

  const handleUpdateSearchSupplierInputValue = (
    data: CommandSupplierInputValue,
  ) => {
    const updateSupplierData =
      data.supplierId === commandSupplierInputValue.supplierId
        ? { supplierId: "", searchSupplierInputValue: "" }
        : data;

    setCommandSupplierInputValue(updateSupplierData);
  };

  const handleUpdateSearchUserInputValue = (data: CommandUserInputValue) => {
    const updateUserData =
      data.userId === commandUserInputValue.userId
        ? { userId: "", searchUserInputValue: "", responsibleUserEmail: "" }
        : data;

    setCommandUserInputValue(updateUserData);
  };

  const handleBusinessBranchStepContinue = () => {
    setCurrentStep("select-vehicle-supplier");
  };

  const handleVehicleSupplierStepContinue = () => {
    setCurrentStep("select-user");
  };

  const handleUserStepContinue = () => {
    setCurrentStep("create-service-order");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
  };

  const handleBackToVehicleSupplierStep = () => {
    setCurrentStep("select-vehicle-supplier");
  };

  const handleBackToUserStep = () => {
    setCurrentStep("select-user");
  };

  const handleCloseDialog = () => {
    handleOpenCreateServiceOrderForm();
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

    setCommandSupplierInputValue({
      supplierId: "",
      searchSupplierInputValue: "",
    });

    setCommandUserInputValue({
      userId: "",
      searchUserInputValue: "",
      responsibleUserEmail: "",
    });

    setServiceOrderFormValues({});
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createServiceOrderError?.createServiceOrderErrorMessage) {
      toast.error(state.createServiceOrderError.createServiceOrderErrorMessage);
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
            revalidateTagName("create-service-order"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "service_order"
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
      handleOpenCreateServiceOrderForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateServiceOrderForm,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    formRef,
    serviceOrderFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardCreateServiceOrderForm };
