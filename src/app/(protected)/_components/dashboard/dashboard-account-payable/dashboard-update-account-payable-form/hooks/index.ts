import { useCallback, useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import type { DashboardAccountPayableProps } from "../../dashboard-account-payable.types";
import type { DashboardUpdateAccountPayableFormState } from "../dashboard-update-account-payable-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { formatServiceOrderDisplay } from "@/lib/format-values";

interface UseDashboardUpdateAccountPayableFormProps {
  state: DashboardUpdateAccountPayableFormState | null;
  handleCloseUpdateAccountPayable: () => void;
  accountPayableData: DashboardAccountPayableProps;
  isUpdateAccountPayableOpen: boolean;
}

function useDashboardUpdateAccountPayableForm({
  state,
  handleCloseUpdateAccountPayable,
  accountPayableData,
  isUpdateAccountPayableOpen,
}: UseDashboardUpdateAccountPayableFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-service-order"
    | "select-user"
    | "update-account-payable"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: accountPayableData.branchId,
      searchBranchInputValue:
        accountPayableData.branch?.corporate_reason ||
        accountPayableData.branch?.fantasy_name ||
        "",
    });

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: accountPayableData.serviceOrderId || "",
      searchServiceOrderInputValue: accountPayableData.serviceOrder
        ? formatServiceOrderDisplay(accountPayableData.serviceOrder)
        : "",
    });

  const [commandUserInputValue, setCommandUserInputValue] =
    useState<CommandUserInputValue>({
      userId: accountPayableData.registrationUserId,
      searchUserInputValue: accountPayableData.registrationUser?.name || "",
      responsibleUserEmail: "",
    });

  // Form values state with callback pattern
  const [accountPayableFormValues, setAccountPayableFormValues] = useState<
    Record<string, string>
  >({});

  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setAccountPayableFormValues(values);
    },
    [],
  );

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateAccountPayableOpen) {
      setCommandBranchInputValue({
        branchId: accountPayableData.branchId,
        searchBranchInputValue:
          accountPayableData.branch?.corporate_reason ||
          accountPayableData.branch?.fantasy_name ||
          "",
      });

      setCommandServiceOrderInputValue({
        serviceOrderId: accountPayableData.serviceOrderId || "",
        searchServiceOrderInputValue: accountPayableData.serviceOrder
          ? formatServiceOrderDisplay(accountPayableData.serviceOrder)
          : "",
      });

      setCommandUserInputValue({
        userId: accountPayableData.registrationUserId,
        searchUserInputValue: accountPayableData.registrationUser?.name || "",
        responsibleUserEmail: "",
      });

      setCurrentStep("select-branch");

      // Reset form values
      setAccountPayableFormValues({});
    }
  }, [isUpdateAccountPayableOpen, accountPayableData]);

  const handleUpdateSearchBranchInputValue = (
    data: CommandBranchInputValue,
  ) => {
    const updateBranchData =
      data.branchId === commandBranchInputValue.branchId
        ? { branchId: "", searchBranchInputValue: "" }
        : data;

    setCommandBranchInputValue(updateBranchData);
  };

  const handleUpdateSearchServiceOrderInputValue = (
    data: CommandServiceOrderInputValue,
  ) => {
    const updateServiceOrderData =
      data.serviceOrderId === commandServiceOrderInputValue.serviceOrderId
        ? { serviceOrderId: "", searchServiceOrderInputValue: "" }
        : data;

    setCommandServiceOrderInputValue(updateServiceOrderData);
  };

  const handleUpdateSearchUserInputValue = (data: CommandUserInputValue) => {
    const updateUserData =
      data.userId === commandUserInputValue.userId
        ? { userId: "", searchUserInputValue: "", responsibleUserEmail: "" }
        : data;

    setCommandUserInputValue(updateUserData);
  };

  // Step navigation
  const handleBranchStepContinue = () => {
    setCurrentStep("select-service-order");
  };

  const handleServiceOrderStepContinue = () => {
    setCurrentStep("select-user");
  };

  const handleUserStepContinue = () => {
    setCurrentStep("update-account-payable");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
  };

  const handleBackToServiceOrderStep = () => {
    setCurrentStep("select-service-order");
  };

  const handleBackToUserStep = () => {
    setCurrentStep("select-user");
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateAccountPayableError?.updateAccountPayableErrorMessage) {
      toast.error(
        state.updateAccountPayableError.updateAccountPayableErrorMessage,
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
          await revalidateTagName("update-account-payable");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleCloseUpdateAccountPayable();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateAccountPayable]);

  const isEntityDirty = [
    commandBranchInputValue.branchId !== accountPayableData.branchId,
    commandServiceOrderInputValue.serviceOrderId !==
      (accountPayableData.serviceOrderId || ""),
    commandUserInputValue.userId !== accountPayableData.registrationUserId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    isEntityDirty,
    accountPayableFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardUpdateAccountPayableForm };
