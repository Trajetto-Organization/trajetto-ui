import { useEffect, useRef, useState, useCallback } from "react";
import { CommandBusinessInputValue, CreateSupplierFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useCreateSupplierForm(state: CreateSupplierFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateSupplierForm, setIsCreateSupplierForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    "select-business" | "create-branch"
  >("select-business");

  const [businessNotSelected, setBusinessNotSelected] = useState<
    string[] | undefined
  >(undefined);

  const [selectedBusiness, setSelectedBusiness] =
    useState<CommandBusinessInputValue>({
      businessId: "",
      searchBusinessInputValue: "",
    });

  // Persisted form values for the last step
  const [supplierFormValues, setSupplierFormValues] = useState<
    Record<string, string>
  >({});

  // Callback to update form values from child component
  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setSupplierFormValues(values);
    },
    [],
  );

  useEffect(() => {
    if (!isCreateSupplierForm) {
      toast.dismiss();
    }
  }, [isCreateSupplierForm]);

  const handleOpenCreateSupplierForm = () => {
    if (isCreateSupplierForm) {
      formRef.current?.reset();

      setSelectedBusiness({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setBusinessNotSelected(undefined);
      setSupplierFormValues({});
    }

    setIsCreateSupplierForm(!isCreateSupplierForm);
  };

  const handleUpdateSearchBusinessInputValue = (
    data: CommandBusinessInputValue,
  ) => {
    const { businessId, searchBusinessInputValue } = data;

    const updateSelectedBusiness =
      selectedBusiness.businessId === businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : { businessId, searchBusinessInputValue };

    setSelectedBusiness(updateSelectedBusiness);

    if (updateSelectedBusiness.businessId) {
      setBusinessNotSelected(undefined);
    }
  };

  const handleContinue = () => {
    if (!selectedBusiness.businessId) {
      setBusinessNotSelected(["Selecione uma empresa para continuar."]);
      return;
    }

    setCurrentStep("create-branch");
    setBusinessNotSelected(undefined);
  };

  const handleBack = () => {
    setCurrentStep("select-business");
  };

  const handleCloseDialog = () => {
    handleOpenCreateSupplierForm();
    setCurrentStep("select-business");

    setSelectedBusiness({
      businessId: "",
      searchBusinessInputValue: "",
    });

    setBusinessNotSelected(undefined);
    setSupplierFormValues({});
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createSupplierError?.createSupplierErrorMessage) {
      toast.error(state.createSupplierError.createSupplierErrorMessage);
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
            revalidateTagName("create-supplier"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "supplier";

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
      handleOpenCreateSupplierForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  const getBusinessIdError = () => {
    return state?.createSupplierError?.businessId || businessNotSelected;
  };

  return {
    isCreateSupplierForm,
    handleUpdateSearchBusinessInputValue,
    getBusinessIdError,
    handleContinue,
    handleCloseDialog,
    currentStep,
    selectedBusiness,
    handleBack,
    formRef,
    supplierFormValues,
    handleFormValuesChange,
  };
}

export { useCreateSupplierForm };
