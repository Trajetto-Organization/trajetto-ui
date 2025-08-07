import { useEffect, useRef, useState } from "react";
import {
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardCreateServiceOrderPartFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

function useDashboardCreateServiceOrderPartForm(
  state: DashboardCreateServiceOrderPartFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [quantityInputValue, setQuantityInputValue] = useState<string>("1");
  const [isCreateServiceOrderPartForm, setIsCreateServiceOrderPartForm] =
    useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<
    "select-service-order-part" | "create-service-order-part"
  >("select-service-order-part");

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

  // Form field states
  const [quantity, setQuantity] = useState<number>(1);
  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>("");

  const [displayDiscountPercentage, setDisplayDiscountPercentage] =
    useState<string>("");

  const handleOpenCreateServiceOrderPartForm = () => {
    if (isCreateServiceOrderPartForm) {
      formRef.current?.reset();

      setCommandServiceOrderInputValue({
        serviceOrderId: "",
        searchServiceOrderInputValue: "",
      });

      setCommandPartInputValue({
        partId: "",
        searchPartInputValue: "",
      });

      setQuantity(1);
      setDisplayUnitPrice("");
      setDisplayDiscountPercentage("");
    }

    setIsCreateServiceOrderPartForm(!isCreateServiceOrderPartForm);
    setCurrentStep("select-service-order-part");
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

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the raw input value
    const value = e.target.value;

    // Allow the field to be completely empty while typing
    if (value === "") {
      setQuantityInputValue("");
      return;
    }

    // Check for zero as the first character when the field was previously empty
    if (quantityInputValue === "" && value === "0") {
      setQuantityInputValue("1");
      setQuantity(1);
      return;
    }

    // Only allow positive integers
    const cleanValue = value.replace(/[^\d]/g, "");

    // If the resulting value is empty after removing non-digits, keep it empty
    if (cleanValue === "") {
      setQuantityInputValue("");
      return;
    }

    // Remove leading zeros by converting to number and back to string
    const normalizedValue = parseInt(cleanValue, 10).toString();

    // For valid numbers, update both the input value and the actual quantity
    const numValue = parseInt(normalizedValue, 10);

    // Only enforce the upper limit (we'll enforce the lower limit on blur)
    if (numValue <= 9999) {
      setQuantityInputValue(normalizedValue);
      setQuantity(numValue);
    } else {
      setQuantityInputValue("9999");
      setQuantity(9999);
    }
  };

  // Add a blur handler to ensure valid values when leaving the field
  const handleQuantityBlur = () => {
    // If empty when leaving the field, set to the minimum value
    if (quantityInputValue === "") {
      setQuantityInputValue("1");
      setQuantity(1);
    }
  };

  const handleUnitPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");
    setDisplayUnitPrice(inputValue);
  };

  const handleUnitPriceBlur = (): void => {
    if (
      !displayUnitPrice ||
      displayUnitPrice === "," ||
      displayUnitPrice === "."
    ) {
      setDisplayUnitPrice("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayUnitPrice);
    setDisplayUnitPrice(formatToBrazilianCurrency(newNumericValue));
  };

  // Update to the handleDiscountPercentageChange function
  const handleDiscountPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // Get the raw input value
    let inputValue = e.target.value;

    // If the input is empty, allow it to be empty
    if (inputValue === "") {
      setDisplayDiscountPercentage("");
      return;
    }

    // Replace comma with period for internal processing
    inputValue = inputValue.replace(",", ".");

    // Remove any additional periods
    const parts = inputValue.split(".");
    if (parts.length > 2) {
      inputValue = parts[0] + "." + parts.slice(1).join("");
    }

    // Remove non-numeric characters (except the single period)
    inputValue = inputValue.replace(/[^\d.]/g, "");

    // Validate that the value is within range (0-100)
    const numericValue = parseFloat(inputValue);
    if (!isNaN(numericValue) && numericValue <= 100) {
      // Store with Brazilian decimal format (using comma)
      setDisplayDiscountPercentage(inputValue.replace(".", ","));
    }
  };

  // Update to the handleDiscountPercentageBlur function
  const handleDiscountPercentageBlur = (): void => {
    // If the field is empty, keep it empty
    if (!displayDiscountPercentage || displayDiscountPercentage === "") {
      setDisplayDiscountPercentage("");
      return;
    }

    // If only commas or periods, clear the field
    if (
      displayDiscountPercentage === "," ||
      displayDiscountPercentage === "."
    ) {
      setDisplayDiscountPercentage("");
      return;
    }

    // Convert to number for consistent formatting
    const numericValue = parseFloat(
      displayDiscountPercentage.replace(",", "."),
    );

    if (isNaN(numericValue)) {
      setDisplayDiscountPercentage("");
      return;
    }

    // Format with one decimal place, using Brazilian format (comma as decimal separator)
    setDisplayDiscountPercentage(numericValue.toFixed(1).replace(".", ","));
  };

  const handleServiceOrderPartStepContinue = () => {
    setCurrentStep("create-service-order-part");
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
    commandServiceOrderInputValue,
    commandPartInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchPartInputValue,
    handleServiceOrderPartStepContinue,
    handleBackToServiceOrderPartStep,
    handleCloseDialog,
    quantity,
    displayUnitPrice,
    displayDiscountPercentage,
    handleQuantityChange,
    handleQuantityBlur,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    handleDiscountPercentageChange,
    handleDiscountPercentageBlur,
    quantityInputValue,
    formRef,
  };
}

export { useDashboardCreateServiceOrderPartForm };
