import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { ServiceOrderProps } from "../../dto";
import { UpdateServiceOrderFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateServiceOrderFormProps {
  state: UpdateServiceOrderFormState | null;
  handleCloseUpdateServiceOrder: () => void;
  serviceOrderData: ServiceOrderProps;
  isUpdateServiceOrderOpen: boolean;
}

function useUpdateServiceOrderForm({
  state,
  handleCloseUpdateServiceOrder,
  serviceOrderData,
  isUpdateServiceOrderOpen,
}: UseUpdateServiceOrderFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Sanitize optional fields that might contain "N/A"
  const sanitizedBranchName =
    serviceOrderData.branchName && serviceOrderData.branchName !== "N/A"
      ? serviceOrderData.branchName
      : "";

  const sanitizedSupplierName =
    serviceOrderData.supplierName && serviceOrderData.supplierName !== "N/A"
      ? serviceOrderData.supplierName
      : "";

  const sanitizedVehicleDescription =
    serviceOrderData.vehicleDescription &&
    serviceOrderData.vehicleDescription !== "N/A"
      ? serviceOrderData.vehicleDescription
      : "";

  const sanitizedResponsibleUserName =
    serviceOrderData.responsibleUserName &&
    serviceOrderData.responsibleUserName !== "N/A"
      ? serviceOrderData.responsibleUserName
      : "";

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-business"
    | "select-vehicle-supplier"
    | "select-user"
    | "update-service-order"
  >("select-business");

  // Initialize form values from service order data with sanitized values
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: serviceOrderData.businessId as string,
      searchBusinessInputValue: serviceOrderData.business_name as string,
    });

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: sanitizedBranchName ? serviceOrderData.branchId || "" : "",
      searchBranchInputValue: sanitizedBranchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: sanitizedVehicleDescription
        ? serviceOrderData.vehicleId || ""
        : "",
      searchVehicleInputValue: sanitizedVehicleDescription,
      vehicleLicensePlate:
        sanitizedVehicleDescription && serviceOrderData.vehicleLicensePlate
          ? serviceOrderData.vehicleLicensePlate
          : "",
    });

  const [commandSupplierInputValue, setCommandSupplierInputValue] =
    useState<CommandSupplierInputValue>({
      supplierId: sanitizedSupplierName
        ? serviceOrderData.supplierId || ""
        : "",
      searchSupplierInputValue: sanitizedSupplierName,
    });

  const [commandUserInputValue, setCommandUserInputValue] =
    useState<CommandUserInputValue>({
      userId: sanitizedResponsibleUserName
        ? serviceOrderData.responsibleUserId || ""
        : "",
      searchUserInputValue: sanitizedResponsibleUserName,
      responsibleUserEmail:
        sanitizedResponsibleUserName && serviceOrderData.responsibleUserEmail
          ? serviceOrderData.responsibleUserEmail
          : "",
    });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateServiceOrderOpen) {
      setCommandBusinessInputValue({
        businessId: serviceOrderData.businessId as string,
        searchBusinessInputValue: serviceOrderData.business_name as string,
      });

      setCommandBranchInputValue({
        branchId: sanitizedBranchName ? serviceOrderData.branchId || "" : "",
        searchBranchInputValue: sanitizedBranchName,
      });

      setCommandVehicleInputValue({
        vehicleId: sanitizedVehicleDescription
          ? serviceOrderData.vehicleId || ""
          : "",
        searchVehicleInputValue: sanitizedVehicleDescription,
        vehicleLicensePlate:
          sanitizedVehicleDescription && serviceOrderData.vehicleLicensePlate
            ? serviceOrderData.vehicleLicensePlate
            : "",
      });

      setCommandSupplierInputValue({
        supplierId: sanitizedSupplierName
          ? serviceOrderData.supplierId || ""
          : "",
        searchSupplierInputValue: sanitizedSupplierName,
      });

      setCommandUserInputValue({
        userId: sanitizedResponsibleUserName
          ? serviceOrderData.responsibleUserId || ""
          : "",
        searchUserInputValue: sanitizedResponsibleUserName,
        responsibleUserEmail:
          sanitizedResponsibleUserName && serviceOrderData.responsibleUserEmail
            ? serviceOrderData.responsibleUserEmail
            : "",
      });

      setCurrentStep("select-business");
    }
  }, [
    isUpdateServiceOrderOpen,
    sanitizedBranchName,
    sanitizedSupplierName,
    sanitizedVehicleDescription,
    sanitizedResponsibleUserName,
    serviceOrderData,
  ]);

  // Handle business and branch selection updates
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

  const handleBackToBusinessStep = () => {
    setCurrentStep("select-business");
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

  // Create sanitized original values for comparison
  const originalBranchId =
    serviceOrderData.branchName !== "N/A"
      ? serviceOrderData.branchId || ""
      : "";
  const originalVehicleId =
    serviceOrderData.vehicleDescription !== "N/A"
      ? serviceOrderData.vehicleId || ""
      : "";
  const originalSupplierId =
    serviceOrderData.supplierName !== "N/A"
      ? serviceOrderData.supplierId || ""
      : "";
  const originalUserId =
    serviceOrderData.responsibleUserName !== "N/A"
      ? serviceOrderData.responsibleUserId || ""
      : "";

  const isBusinessAndEntityDirty = [
    commandBusinessInputValue.businessId !== serviceOrderData.businessId,
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandSupplierInputValue.supplierId !== originalSupplierId,
    commandUserInputValue.userId !== originalUserId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleBusinessStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBusinessStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
  };
}

export { useUpdateServiceOrderForm };
