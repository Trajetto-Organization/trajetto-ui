import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  CommandBranchInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardServiceOrderProps } from "../../dto";
import { DashboardUpdateServiceOrderFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseDashboardUpdateServiceOrderFormProps {
  state: DashboardUpdateServiceOrderFormState | null;
  handleCloseUpdateServiceOrder: () => void;
  serviceOrderData: DashboardServiceOrderProps;
  isUpdateServiceOrderOpen: boolean;
}

function useDashboardUpdateServiceOrderForm({
  state,
  handleCloseUpdateServiceOrder,
  serviceOrderData,
  isUpdateServiceOrderOpen,
}: UseDashboardUpdateServiceOrderFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Memoize extracted values from nested objects to prevent re-renders
  const branchName = useMemo(
    () => serviceOrderData.branch?.corporate_reason || "",
    [serviceOrderData.branch?.corporate_reason],
  );

  const supplierName = useMemo(
    () => serviceOrderData.supplier?.name || "",
    [serviceOrderData.supplier?.name],
  );

  const vehicleDescription = useMemo(
    () => serviceOrderData.vehicle?.description || "",
    [serviceOrderData.vehicle?.description],
  );

  const vehicleLicensePlate = useMemo(
    () => serviceOrderData.vehicle?.license_plate || "",
    [serviceOrderData.vehicle?.license_plate],
  );

  const responsibleUserName = useMemo(
    () => serviceOrderData.responsibleUser?.name || "",
    [serviceOrderData.responsibleUser?.name],
  );

  const responsibleUserEmail = useMemo(
    () => serviceOrderData.responsibleUser?.email || "",
    [serviceOrderData.responsibleUser?.email],
  );

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-vehicle-supplier"
    | "select-user"
    | "update-service-order"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: branchName ? serviceOrderData.branchId || "" : "",
      searchBranchInputValue: branchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: vehicleDescription ? serviceOrderData.vehicleId || "" : "",
      searchVehicleInputValue: vehicleDescription,
      vehicleLicensePlate: vehicleLicensePlate,
    });

  const [commandSupplierInputValue, setCommandSupplierInputValue] =
    useState<CommandSupplierInputValue>({
      supplierId: supplierName ? serviceOrderData.supplierId || "" : "",
      searchSupplierInputValue: supplierName,
    });

  const [commandUserInputValue, setCommandUserInputValue] =
    useState<CommandUserInputValue>({
      userId: responsibleUserName
        ? serviceOrderData.responsibleUserId || ""
        : "",
      searchUserInputValue: responsibleUserName,
      responsibleUserEmail: responsibleUserEmail,
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

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateServiceOrderOpen) {
      setCommandBranchInputValue({
        branchId: branchName ? serviceOrderData.branchId || "" : "",
        searchBranchInputValue: branchName,
      });

      setCommandVehicleInputValue({
        vehicleId: vehicleDescription ? serviceOrderData.vehicleId || "" : "",
        searchVehicleInputValue: vehicleDescription,
        vehicleLicensePlate: vehicleLicensePlate,
      });

      setCommandSupplierInputValue({
        supplierId: supplierName ? serviceOrderData.supplierId || "" : "",
        searchSupplierInputValue: supplierName,
      });

      setCommandUserInputValue({
        userId: responsibleUserName
          ? serviceOrderData.responsibleUserId || ""
          : "",
        searchUserInputValue: responsibleUserName,
        responsibleUserEmail: responsibleUserEmail,
      });

      setServiceOrderFormValues({});
      setCurrentStep("select-branch");
    }
  }, [
    isUpdateServiceOrderOpen,
    branchName,
    supplierName,
    vehicleDescription,
    vehicleLicensePlate,
    responsibleUserName,
    responsibleUserEmail,
    serviceOrderData,
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

  // Step navigation
  const handleBusinessStepContinue = () => {
    setCurrentStep("select-vehicle-supplier");
  };

  const handleVehicleSupplierStepContinue = () => {
    setCurrentStep("select-user");
  };

  const handleUserStepContinue = () => {
    setCurrentStep("update-service-order");
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

  useEffect(() => {
    // Handle error case first
    if (state?.updateServiceOrderError?.updateServiceOrderErrorMessage) {
      toast.error(state.updateServiceOrderError.updateServiceOrderErrorMessage);
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
            revalidateTagName("update-service-order"),
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
      handleCloseUpdateServiceOrder();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateServiceOrder]);

  // Get original IDs for comparison
  const originalBranchId = serviceOrderData.branchId || "";
  const originalVehicleId = serviceOrderData.vehicleId || "";

  const originalSupplierId = serviceOrderData.supplierId || "";
  const originalUserId = serviceOrderData.responsibleUserId || "";

  const isEntityDirty = [
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandSupplierInputValue.supplierId !== originalSupplierId,
    commandUserInputValue.userId !== originalUserId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleBusinessStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    isEntityDirty,
    serviceOrderFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardUpdateServiceOrderForm };
