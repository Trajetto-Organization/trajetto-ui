import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

import { CommandBranchInputValue } from "@/app/(protected)/_components/dto";

import { DashboardDriverProps } from "../../dto";
import { DashboardUpdateDriverFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

interface UseDashboardUpdateDriverFormProps {
  state: DashboardUpdateDriverFormState | null;
  handleCloseUpdateDriver: () => void;
  driverData: DashboardDriverProps;
  isUpdateDriverOpen: boolean;
}

function useDashboardUpdateDriverForm({
  state,
  handleCloseUpdateDriver,
  isUpdateDriverOpen,
  driverData,
}: UseDashboardUpdateDriverFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<
    "select-branch" | "update-driver"
  >("select-branch");

  // Extract values from nested objects - memoized to prevent unnecessary re-renders
  const branchName = useMemo(
    () => driverData.branch?.corporate_reason || "",
    [driverData.branch?.corporate_reason],
  );

  const { businessId, branchId } = driverData;

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      searchBranchInputValue: branchName,
      branchId: branchName ? branchId! : "",
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
    if (!isUpdateDriverOpen) {
      setCommandBranchInputValue({
        searchBranchInputValue: branchName,
        branchId: branchName ? branchId! : "",
      });

      setDriverFormValues({});
    }
  }, [isUpdateDriverOpen, businessId, branchId, branchName]);

  const handleUpdateSearchBranchInputValue = (
    data: CommandBranchInputValue,
  ) => {
    const updateBranchData =
      data.branchId === commandBranchInputValue.branchId
        ? { branchId: "", searchBranchInputValue: "" }
        : data;

    setCommandBranchInputValue(updateBranchData);
  };

  // Step navigation
  const handleContinue = () => {
    setCurrentStep("update-driver");
  };

  const handleBack = () => {
    setCurrentStep("select-branch");
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateDriverError?.updateDriverErrorMessage) {
      toast.error(state.updateDriverError.updateDriverErrorMessage);
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
            revalidateTagName("update-driver"),
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
      handleCloseUpdateDriver();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  const isBranchDirty = [
    commandBranchInputValue.branchId !== (branchId ?? ""),
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    handleBack,
    handleContinue,
    handleUpdateSearchBranchInputValue,
    isBranchDirty,
    driverFormValues,
    handleFormValuesChange,
  };
}

export { useDashboardUpdateDriverForm };
