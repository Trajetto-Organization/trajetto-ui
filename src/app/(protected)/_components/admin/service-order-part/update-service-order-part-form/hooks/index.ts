import { useEffect, useRef, useState, useCallback } from "react";
import type {
  CommandBusinessInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import type { ServiceOrderPartProps } from "../../service-order-part.types";
import type { UpdateServiceOrderPartFormState } from "../update-service-order-part-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { formatServiceOrderDisplay } from "@/lib/format-values";

import { toast } from "sonner";

interface UseUpdateServiceOrderPartFormProps {
  state: UpdateServiceOrderPartFormState | null;
  handleCloseUpdateServiceOrderPart: () => void;
  serviceOrderPartData: ServiceOrderPartProps;
  isUpdateServiceOrderPartOpen: boolean;
}

function useUpdateServiceOrderPartForm({
  state,
  handleCloseUpdateServiceOrderPart,
  serviceOrderPartData,
  isUpdateServiceOrderPartOpen,
}: UseUpdateServiceOrderPartFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-business"
    | "select-service-order-part"
    | "update-service-order-part"
  >("select-business");

  // Initialize form values from service order part data
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: serviceOrderPartData.businessId,
      searchBusinessInputValue:
        serviceOrderPartData.business?.corporate_reason || "",
    });

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: serviceOrderPartData.serviceOrderId,
      searchServiceOrderInputValue: serviceOrderPartData.serviceOrder
        ? formatServiceOrderDisplay(serviceOrderPartData.serviceOrder)
        : "",
    });

  const [commandPartInputValue, setCommandPartInputValue] =
    useState<CommandPartInputValue>({
      partId: serviceOrderPartData.partId,
      searchPartInputValue: serviceOrderPartData.part?.description || "",
    });

  // Persisted form values for the last step
  const [serviceOrderPartFormValues, setServiceOrderPartFormValues] = useState<
    Record<string, string>
  >({});

  // Callback to update form values from child component
  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setServiceOrderPartFormValues(values);
    },
    [],
  );

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateServiceOrderPartOpen) {
      setCommandBusinessInputValue({
        businessId: serviceOrderPartData.businessId,
        searchBusinessInputValue:
          serviceOrderPartData.business?.corporate_reason || "",
      });

      setCommandServiceOrderInputValue({
        serviceOrderId: serviceOrderPartData.serviceOrderId,
        searchServiceOrderInputValue: serviceOrderPartData.serviceOrder
          ? formatServiceOrderDisplay(serviceOrderPartData.serviceOrder)
          : "",
      });

      setCommandPartInputValue({
        partId: serviceOrderPartData.partId,
        searchPartInputValue: serviceOrderPartData.part?.description || "",
      });

      setServiceOrderPartFormValues({});
      setCurrentStep("select-business");
    }
  }, [
    isUpdateServiceOrderPartOpen,
    serviceOrderPartData.businessId,
    serviceOrderPartData.serviceOrderId,
    serviceOrderPartData.serviceOrder,
    serviceOrderPartData.partId,
    serviceOrderPartData.part?.description,
    serviceOrderPartData.business?.corporate_reason,
  ]);

  // Handle business selection updates
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
      setCommandServiceOrderInputValue({
        serviceOrderId: "",
        searchServiceOrderInputValue: "",
      });

      setCommandPartInputValue({
        partId: "",
        searchPartInputValue: "",
      });
    }

    setCommandBusinessInputValue(updateBusinessData);
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

  const handleUpdateSearchPartInputValue = (data: CommandPartInputValue) => {
    const updatePartData =
      data.partId === commandPartInputValue.partId
        ? { partId: "", searchPartInputValue: "" }
        : data;

    setCommandPartInputValue(updatePartData);
  };

  // Step navigation
  const handleBusinessStepContinue = () => {
    setCurrentStep("select-service-order-part");
  };

  const handleServiceOrderPartStepContinue = () => {
    setCurrentStep("update-service-order-part");
  };

  const handleBackToBusinessStep = () => {
    setCurrentStep("select-business");
  };

  const handleBackToServiceOrderPartStep = () => {
    setCurrentStep("select-service-order-part");
  };

  useEffect(() => {
    // Handle error case first
    if (
      state?.updateServiceOrderPartError?.updateServiceOrderPartErrorMessage
    ) {
      toast.error(
        state.updateServiceOrderPartError.updateServiceOrderPartErrorMessage,
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
          await revalidateTagName("update-service-order-part");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleCloseUpdateServiceOrderPart();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateServiceOrderPart]);

  const isBusinessAndEntityDirty = [
    commandBusinessInputValue.businessId !== serviceOrderPartData.businessId,
    commandServiceOrderInputValue.serviceOrderId !==
      serviceOrderPartData.serviceOrderId,
    commandPartInputValue.partId !== serviceOrderPartData.partId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandServiceOrderInputValue,
    commandPartInputValue,
    handleBusinessStepContinue,
    handleServiceOrderPartStepContinue,
    handleBackToBusinessStep,
    handleBackToServiceOrderPartStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchPartInputValue,
    isBusinessAndEntityDirty,
    serviceOrderPartFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateServiceOrderPartForm };
