import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardAccountPayableProps } from "../../dto";
import { DashboardUpdateAccountPayableFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

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
      searchBranchInputValue: accountPayableData.branchName || "",
    });

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: accountPayableData.serviceOrderId || "",
      searchServiceOrderInputValue:
        accountPayableData.serviceOrderDescription || "",
    });

  const [commandUserInputValue, setCommandUserInputValue] =
    useState<CommandUserInputValue>({
      userId: accountPayableData.registrationUserId,
      searchUserInputValue: accountPayableData.registrationUserName || "",
      responsibleUserEmail: "",
    });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateAccountPayableOpen) {
      setCommandBranchInputValue({
        branchId: accountPayableData.branchId,
        searchBranchInputValue: accountPayableData.branchName || "",
      });

      setCommandServiceOrderInputValue({
        serviceOrderId: accountPayableData.serviceOrderId || "",
        searchServiceOrderInputValue:
          accountPayableData.serviceOrderDescription || "",
      });

      setCommandUserInputValue({
        userId: accountPayableData.registrationUserId,
        searchUserInputValue: accountPayableData.registrationUserName || "",
        responsibleUserEmail: "",
      });

      setCurrentStep("select-branch");
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
  const handleBusinessBranchStepContinue = () => {
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

  const isBusinessAndEntityDirty = [
    commandBranchInputValue.branchId !== accountPayableData.branchId,
    commandServiceOrderInputValue.serviceOrderId !==
      accountPayableData.serviceOrderId,
    commandUserInputValue.userId !== accountPayableData.registrationUserId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleBusinessBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
  };
}

export { useDashboardUpdateAccountPayableForm };
