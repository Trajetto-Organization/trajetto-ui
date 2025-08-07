import { useEffect, useRef, useState } from "react";
import {
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardServiceOrderPartProps } from "../../dto";
import { DashboardUpdateServiceOrderPartFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { formatDate } from "@/lib/format-values";

interface UseDashboardUpdateServiceOrderPartFormProps {
  state: DashboardUpdateServiceOrderPartFormState | null;
  handleCloseUpdateServiceOrderPart: () => void;
  serviceOrderPartData: DashboardServiceOrderPartProps;
  isUpdateServiceOrderPartOpen: boolean;
}

function useDashboardUpdateServiceOrderPartForm({
  state,
  handleCloseUpdateServiceOrderPart,
  serviceOrderPartData,
  isUpdateServiceOrderPartOpen,
}: UseDashboardUpdateServiceOrderPartFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<
    "select-service-order-part" | "update-service-order-part"
  >("select-service-order-part");

  const formatServiceOrderDisplayString = (serviceOrderDate: string) => {
    const formattedDate =
      formatDate(serviceOrderDate, "pt-BR") || serviceOrderDate;

    // Get vehicle info if available
    const vehicleInfo = serviceOrderPartData.vehicleLicensePlate
      ? `(Veículo: ${serviceOrderPartData.vehicleDescription || ""} - Placa: ${serviceOrderPartData.vehicleLicensePlate})`
      : "";

    // Combine ID and date for a unique display
    return `OS#${serviceOrderPartData.serviceOrderId.substring(0, 8)} - ${formattedDate} ${vehicleInfo}`;
  };

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: serviceOrderPartData.serviceOrderId,
      searchServiceOrderInputValue: formatServiceOrderDisplayString(
        serviceOrderPartData.serviceOrderDate,
      ),
    });

  const [commandPartInputValue, setCommandPartInputValue] =
    useState<CommandPartInputValue>({
      partId: serviceOrderPartData.partId,
      searchPartInputValue: serviceOrderPartData.partDescription,
    });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateServiceOrderPartOpen) {
      setCommandServiceOrderInputValue({
        serviceOrderId: serviceOrderPartData.serviceOrderId,
        searchServiceOrderInputValue: formatServiceOrderDisplayString(
          serviceOrderPartData.serviceOrderDate,
        ),
      });

      setCommandPartInputValue({
        partId: serviceOrderPartData.partId,
        searchPartInputValue: serviceOrderPartData.partDescription,
      });

      setCurrentStep("select-service-order-part");
    }
  }, [
    isUpdateServiceOrderPartOpen,
    serviceOrderPartData.businessId,
    serviceOrderPartData.serviceOrderId,
    serviceOrderPartData.serviceOrderDate,
    serviceOrderPartData.partId,
    serviceOrderPartData.partDescription,
  ]);

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

  const handleServiceOrderPartStepContinue = () => {
    setCurrentStep("update-service-order-part");
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
    commandServiceOrderInputValue.serviceOrderId !==
      serviceOrderPartData.serviceOrderId,
    commandPartInputValue.partId !== serviceOrderPartData.partId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandServiceOrderInputValue,
    commandPartInputValue,
    handleServiceOrderPartStepContinue,
    handleBackToServiceOrderPartStep,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchPartInputValue,
    isBusinessAndEntityDirty,
  };
}

export { useDashboardUpdateServiceOrderPartForm };
