import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { CreateServiceOrderFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useCreateServiceOrderForm(state: CreateServiceOrderFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateServiceOrderForm, setIsCreateServiceOrderForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-business-branch"
    | "select-vehicle-supplier"
    | "select-user"
    | "create-service-order"
  >("select-business-branch");

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: "",
      searchBusinessInputValue: "",
    });

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

  useEffect(() => {
    if (!isCreateServiceOrderForm) {
      toast.dismiss();
    }
  }, [isCreateServiceOrderForm]);

  const handleOpenCreateServiceOrderForm = () => {
    if (isCreateServiceOrderForm) {
      formRef.current?.reset();

      setCommandBusinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

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
    }

    setIsCreateServiceOrderForm(!isCreateServiceOrderForm);
  };

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

      setCommandSupplierInputValue({
        supplierId: "",
        searchSupplierInputValue: "",
      });

      setCommandUserInputValue({
        userId: "",
        searchUserInputValue: "",
        responsibleUserEmail: "",
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

  const handleBackToBusinessBranchStep = () => {
    setCurrentStep("select-business-branch");
  };

  const handleBackToVehicleSupplierStep = () => {
    setCurrentStep("select-vehicle-supplier");
  };

  const handleBackToUserStep = () => {
    setCurrentStep("select-user");
  };

  const handleCloseDialog = () => {
    handleOpenCreateServiceOrderForm();
    setCurrentStep("select-business-branch");

    // Reset all form values
    setCommandBusinessInputValue({
      businessId: "",
      searchBusinessInputValue: "",
    });

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
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    formRef,
  };
}

export { useCreateServiceOrderForm };
