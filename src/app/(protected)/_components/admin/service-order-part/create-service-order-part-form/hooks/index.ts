import { useEffect, useRef, useState, useCallback } from "react";

import type {
  CommandBusinessInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import type { CreateServiceOrderPartFormState } from "../create-service-order-part-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

function useCreateServiceOrderPartForm(
  state: CreateServiceOrderPartFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateServiceOrderPartForm, setIsCreateServiceOrderPartForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    | "select-business"
    | "select-service-order-part"
    | "create-service-order-part"
  >("select-business");

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: "",
      searchBusinessInputValue: "",
    });

  const [commandServiceOrderInputValue, setCommandServiceOrderInputValue] =
    useState<CommandServiceOrderInputValue>({
      serviceOrderId: "",
      searchServiceOrderInputValue: "",
    });

  const [commandPartInputValue, setCommandPartInputValue] =
    useState<CommandPartInputValue>({
      partId: "",
      searchPartInputValue: "",
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

  const handleOpenCreateServiceOrderPartForm = () => {
    if (isCreateServiceOrderPartForm) {
      formRef.current?.reset();

      setCommandBusinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setCommandServiceOrderInputValue({
        serviceOrderId: "",
        searchServiceOrderInputValue: "",
      });

      setCommandPartInputValue({
        partId: "",
        searchPartInputValue: "",
      });

      setServiceOrderPartFormValues({});
    }

    setIsCreateServiceOrderPartForm(!isCreateServiceOrderPartForm);
    setCurrentStep("select-business");
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

  const handleBusinessStepContinue = () => {
    setCurrentStep("select-service-order-part");
  };

  const handleServiceOrderPartStepContinue = () => {
    setCurrentStep("create-service-order-part");
  };

  const handleBackToBusinessStep = () => {
    setCurrentStep("select-business");
  };

  const handleBackToServiceOrderPartStep = () => {
    setCurrentStep("select-service-order-part");
  };

  const handleCloseDialog = () => {
    handleOpenCreateServiceOrderPartForm();
  };

  useEffect(() => {
    // Handle error case first
    if (
      state?.createServiceOrderPartError?.createServiceOrderPartErrorMessage
    ) {
      toast.error(
        state.createServiceOrderPartError.createServiceOrderPartErrorMessage,
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
          await revalidateTagName("create-service-order-part");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleOpenCreateServiceOrderPartForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateServiceOrderPartForm,
    handleOpenCreateServiceOrderPartForm,
    currentStep,
    commandBusinessInputValue,
    commandServiceOrderInputValue,
    commandPartInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchPartInputValue,
    handleBusinessStepContinue,
    handleServiceOrderPartStepContinue,
    handleBackToBusinessStep,
    handleBackToServiceOrderPartStep,
    handleCloseDialog,
    formRef,
    serviceOrderPartFormValues,
    handleFormValuesChange,
  };
}

export { useCreateServiceOrderPartForm };
