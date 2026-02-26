import { useEffect, useRef, useState, useCallback } from "react";
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
    "select-business-branch" | "create-branch"
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

  // Persisted form values for the last step
  const [driverFormValues, setDriverFormValues] = useState<
    Record<string, string>
  >({});

  // Callback to update form values from child component
  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setDriverFormValues(values);
    },
    [],
  );

  useEffect(() => {
    if (!isCreateDriverForm) {
      toast.dismiss();
    }
  }, [isCreateDriverForm]);

  const handleOpenCreateDriverForm = () => {
    if (isCreateDriverForm) {
      formRef.current?.reset();

      setCommandBusinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });

      setDriverFormValues({});
    }

    setIsCreateDriverForm(!isCreateDriverForm);
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

  const handleContinue = () => {
    setCurrentStep("create-branch");
  };

  const handleBack = () => {
    setCurrentStep("select-business-branch");
  };

  const handleCloseDialog = () => {
    handleOpenCreateDriverForm();
    setCurrentStep("select-business-branch");

    setCommandBusinessInputValue({
      businessId: "",
      searchBusinessInputValue: "",
    });

    setCommandBranchInputValue({
      branchId: "",
      searchBranchInputValue: "",
    });

    setDriverFormValues({});
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
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleContinue,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    handleBack,
    formRef,
    driverFormValues,
    handleFormValuesChange,
  };
}

export { useCreateDriverForm };
