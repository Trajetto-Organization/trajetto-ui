import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CreateDriverFormState,
} from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useCreateDriverForm(state: CreateDriverFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateDriverForm, setIsCreateDriverForm] = useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    "select-business" | "create-branch"
  >("select-business");

  const [commandBusinnessInputValue, setCommandBussinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: "",
      searchBusinessInputValue: "",
    });

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

      setCommandBussinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });
    }

    setIsCreateDriverForm(!isCreateDriverForm);
  };

  const handleUpdateSearchBussinessInputValue = (
    data: CommandBusinessInputValue,
  ) => {
    const updateBusinessData =
      data.businessId === commandBusinnessInputValue.businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : data;

    if (
      updateBusinessData.businessId !== commandBusinnessInputValue.businessId
    ) {
      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });
    }

    setCommandBussinessInputValue(updateBusinessData);
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
    setCurrentStep("create-branch");
  };

  const handleBack = () => {
    setCurrentStep("select-business");
  };

  const handleCloseDialog = () => {
    handleOpenCreateDriverForm();
    setCurrentStep("select-business");

    setCommandBussinessInputValue({
      businessId: "",
      searchBusinessInputValue: "",
    });

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
    handleUpdateSearchBussinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleContinue,
    handleCloseDialog,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    handleBack,
    formRef,
  };
}

export { useCreateDriverForm };
