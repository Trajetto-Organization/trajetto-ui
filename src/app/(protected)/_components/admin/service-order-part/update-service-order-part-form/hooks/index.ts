import { useEffect, useRef, useState } from "react";
import {
  CommandBusinessInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

import { ServiceOrderPartProps } from "../../dto";
import { UpdateServiceOrderPartFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
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
      searchBusinessInputValue: serviceOrderPartData.business_name as string, // This might need to be the business name instead
    });

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: serviceOrderPartData.serviceOrderId,
      searchServiceOrderInputValue:
        serviceOrderPartData.serviceOrderDescription as string,
    });

  const [commandPartInputValue, setCommandPartInputValue] =
    useState<CommandPartInputValue>({
      partId: serviceOrderPartData.partId,
      searchPartInputValue: serviceOrderPartData.partDescription,
    });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateServiceOrderPartOpen) {
      setCommandBusinessInputValue({
        businessId: serviceOrderPartData.businessId,
        searchBusinessInputValue: serviceOrderPartData.business_name as string,
      });

      setCommandServiceOrderInputValue({
        serviceOrderId: serviceOrderPartData.serviceOrderId,
        searchServiceOrderInputValue:
          serviceOrderPartData.serviceOrderDescription as string,
      });

      setCommandPartInputValue({
        partId: serviceOrderPartData.partId,
        searchPartInputValue: serviceOrderPartData.partDescription,
      });

      setCurrentStep("select-business");
    }
  }, [
    isUpdateServiceOrderPartOpen,
    serviceOrderPartData.businessId,
    serviceOrderPartData.serviceOrderId,
    serviceOrderPartData.serviceOrderDate,
    serviceOrderPartData.partId,
    serviceOrderPartData.partDescription,
    serviceOrderPartData.business_name,
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
  };
}

export { useUpdateServiceOrderPartForm };
