import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
} from "@/app/(protected)/_components/dto";

import { DriverProps } from "../../dto";
import { UpdateDriverFormState } from "../dto";

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
  driverData: { business_name, branchName, businessId, branchId },
}: UseUpdateDriverFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<
    "select-business" | "update-driver"
  >("select-business");

  const sanitizedBranchName =
    branchName && branchName !== "N/A" ? branchName : "";

  // Initialize business and branch input values from driver data
  const [commandBusinnessInputValue, setCommandBusinnessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: businessId as string,
      searchBusinessInputValue: business_name as string,
    });

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      searchBranchInputValue: sanitizedBranchName,
      branchId: sanitizedBranchName ? branchId! : "",
    });

  useEffect(() => {
    if (!isUpdateDriverOpen) {
      setCommandBusinnessInputValue({
        businessId: businessId as string,
        searchBusinessInputValue: business_name as string,
      });

      setCommandBranchInputValue({
        searchBranchInputValue: sanitizedBranchName,
        branchId: sanitizedBranchName ? branchId! : "",
      });
    }
  }, [
    isUpdateDriverOpen,
    commandBusinnessInputValue,
    commandBranchInputValue,
    businessId,
    branchId,
    branchName,
    business_name,
    sanitizedBranchName,
  ]);

  // Handle business and branch selection updates
  const handleUpdateSearchBusinnessInputValue = (
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

    setCommandBusinnessInputValue(updateBusinessData);
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
    setCurrentStep("select-business");
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
    commandBusinnessInputValue.businessId !== businessId,
    commandBranchInputValue.branchId !== (branchId ?? ""),
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    handleBack,
    handleContinue,
    handleUpdateSearchBusinnessInputValue,
    handleUpdateSearchBranchInputValue,
    isBusinessAndBranchDirty,
  };
}

export { useUpdateDriverForm };
