import { useCallback, useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardCreateAccountPayableFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

function useDashboardCreateAccountPayableForm(
  state: DashboardCreateAccountPayableFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateAccountPayableForm, setIsCreateAccountPayableForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-service-order"
    | "select-user"
    | "create-account-payable"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: "",
      searchBranchInputValue: "",
    });

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: "",
      searchServiceOrderInputValue: "",
    });

  const [commandUserInputValue, setCommandUserInputValue] =
    useState<CommandUserInputValue>({
      userId: "",
      searchUserInputValue: "",
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

  useEffect(() => {
    if (!isCreateAccountPayableForm) {
      toast.dismiss();
    }
  }, [isCreateAccountPayableForm]);

  const handleOpenCreateAccountPayableForm = () => {
    if (isCreateAccountPayableForm) {
      formRef.current?.reset();

      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });

      setCommandServiceOrderInputValue({
        serviceOrderId: "",
        searchServiceOrderInputValue: "",
      });

      setCommandUserInputValue({
        userId: "",
        searchUserInputValue: "",
        responsibleUserEmail: "",
      });

      setAccountPayableFormValues({});
    }

    setIsCreateAccountPayableForm(!isCreateAccountPayableForm);
    setCurrentStep("select-branch");
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

  const handleBranchStepContinue = () => {
    setCurrentStep("select-service-order");
  };

  const handleServiceOrderStepContinue = () => {
    setCurrentStep("select-user");
  };

  const handleUserStepContinue = () => {
    setCurrentStep("create-account-payable");
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

  const handleCloseDialog = () => {
    handleOpenCreateAccountPayableForm();
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createAccountPayableError?.createAccountPayableErrorMessage) {
      toast.error(
        state.createAccountPayableError.createAccountPayableErrorMessage,
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
          await revalidateTagName("create-account-payable");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleOpenCreateAccountPayableForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateAccountPayableForm,
    handleOpenCreateAccountPayableForm,
    currentStep,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    handleBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    handleCloseDialog,
    accountPayableFormValues,
    handleFormValuesChange,
    formRef,
  };
}

export { useDashboardCreateAccountPayableForm };
