import { useEffect, useRef, useState, useCallback } from "react";

import { CommandBusinessInputValue } from "../../../../dto";
import { UpdateSupplierFormState } from "../dto";

import { SupplierProps } from "../../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateSupplierFormProps {
  state: UpdateSupplierFormState | null;
  handleCloseUpdateSupplier: () => void;
  supplierData: SupplierProps;
  isUpdateSupplierOpen: boolean;
}

function useUpdateSupplierForm({
  state,
  handleCloseUpdateSupplier,
  supplierData,
  isUpdateSupplierOpen,
}: UseUpdateSupplierFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const businessNotSelectedRef = useRef<string[] | undefined>(undefined);

  // Step-based state
  const [currentStep, setCurrentStep] = useState<
    "select-business" | "update-supplier"
  >("select-business");

  // Business selection state
  const [selectedBusiness, setSelectedBusiness] =
    useState<CommandBusinessInputValue>({
      businessId: supplierData.businessId || "",
      searchBusinessInputValue: supplierData.business?.corporate_reason || "",
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

  // Reset state when dialog closes
  useEffect(() => {
    if (!isUpdateSupplierOpen) {
      setCurrentStep("select-business");

      setSelectedBusiness({
        businessId: supplierData.businessId || "",
        searchBusinessInputValue: supplierData.business?.corporate_reason || "",
      });

      businessNotSelectedRef.current = undefined;
      setSupplierFormValues({});
    }
  }, [
    isUpdateSupplierOpen,
    supplierData.businessId,
    supplierData.business?.corporate_reason,
  ]);

  useEffect(() => {
    // Handle error case first
    if (state?.updateSupplierError?.updateSupplierErrorMessage) {
      toast.error(state.updateSupplierError.updateSupplierErrorMessage);
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
            revalidateTagName("update-supplier"),
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
      handleCloseUpdateSupplier();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateSupplier]);

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
      businessNotSelectedRef.current = undefined;
    }
  };

  const handleContinue = () => {
    if (!selectedBusiness.businessId) {
      businessNotSelectedRef.current = [
        "Selecione uma empresa para continuar.",
      ];
      return;
    }

    setCurrentStep("update-supplier");
    businessNotSelectedRef.current = undefined;
  };

  const handleBack = () => {
    setCurrentStep("select-business");
  };

  const isDirty = selectedBusiness.businessId !== supplierData.businessId;

  const getBusinessIdError = () => {
    return (
      state?.updateSupplierError?.businessId || businessNotSelectedRef.current
    );
  };

  return {
    formRef,
    currentStep,
    selectedBusiness,
    handleUpdateSearchBusinessInputValue,
    handleContinue,
    handleBack,
    isDirty,
    getBusinessIdError,
    supplierFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateSupplierForm };
