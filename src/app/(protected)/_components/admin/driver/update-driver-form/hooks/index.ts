import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

import type {
  CommandBranchInputValue,
  CommandBusinessInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import type { DriverProps } from "../../driver.types";
import type { UpdateDriverFormState } from "../update-driver-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateDriverFormProps {
  state: UpdateDriverFormState | null;
  handleCloseUpdateDriver: () => void;
  driverData: DriverProps;
  isUpdateDriverOpen: boolean;
}

function useUpdateDriverForm({
  state,
  handleCloseUpdateDriver,
  isUpdateDriverOpen,
  driverData,
}: UseUpdateDriverFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<
    "select-business-branch" | "update-driver"
  >("select-business-branch");

  // Extract values from nested objects - memoized to prevent unnecessary re-renders
  const businessName = useMemo(
    () => driverData.business?.corporate_reason || "",
    [driverData.business?.corporate_reason],
  );

  const branchName = useMemo(
    () => driverData.branch?.corporate_reason || "",
    [driverData.branch?.corporate_reason],
  );

  const { businessId, branchId } = driverData;

  // Initialize business and branch input values from driver data
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: businessId as string,
      searchBusinessInputValue: businessName,
    });

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
      setCommandBusinessInputValue({
        businessId: businessId as string,
        searchBusinessInputValue: businessName,
      });

      setCommandBranchInputValue({
        searchBranchInputValue: branchName,
        branchId: branchName ? branchId! : "",
      });

      setDriverFormValues({});
    }
  }, [isUpdateDriverOpen, businessId, branchId, businessName, branchName]);

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

  // Step navigation
  const handleContinue = () => {
    setCurrentStep("update-driver");
  };

  const handleBack = () => {
    setCurrentStep("select-business-branch");
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

  const isBusinessAndBranchDirty = [
    commandBusinessInputValue.businessId !== businessId,
    commandBranchInputValue.branchId !== (branchId ?? ""),
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    handleBack,
    handleContinue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    isBusinessAndBranchDirty,
    driverFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateDriverForm };
