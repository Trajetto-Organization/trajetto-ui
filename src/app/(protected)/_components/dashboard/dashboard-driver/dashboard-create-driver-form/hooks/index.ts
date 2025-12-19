import { useEffect, useRef, useState } from "react";

import { CommandBranchInputValue } from "@/app/(protected)/_components/dto";
import { DashboardCreateDriverFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useDashboardCreateDriverForm(
  state: DashboardCreateDriverFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateDriverForm, setIsCreateDriverForm] = useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    "select-branch" | "create-driver"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: "",
      searchBranchInputValue: "",
    });

  useEffect(() => {
    if (!isCreateDriverForm) {
      toast.dismiss();
    }
  }, [isCreateDriverForm]);

  const handleOpenCreateDriverForm = () => {
    if (isCreateDriverForm) {
      formRef.current?.reset();

      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });
    }

    setIsCreateDriverForm(!isCreateDriverForm);
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

  const handleContinue = () => {
    setCurrentStep("create-driver");
  };

  const handleBack = () => {
    setCurrentStep("select-branch");
  };

  const handleCloseDialog = () => {
    handleOpenCreateDriverForm();
    setCurrentStep("select-branch");

    setCommandBranchInputValue({
      branchId: "",
      searchBranchInputValue: "",
    });
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createDriverError?.createDriverErrorMessage) {
      toast.error(state.createDriverError.createDriverErrorMessage);
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
            revalidateTagName("create-driver"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "driver";

                return isMatch;
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
      handleOpenCreateDriverForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateDriverForm,
    handleUpdateSearchBranchInputValue,
    handleContinue,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    handleBack,
    formRef,
  };
}

export { useDashboardCreateDriverForm };
