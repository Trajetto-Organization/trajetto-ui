import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateServiceOrderPart } from "@/actions/service-order-part/update-service-order-part";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useUpdateServiceOrderPartForm } from "./hooks";

import { SelectBusinessStep } from "@/app/(protected)/_components/steps/select-business-step";
import { SelectServiceOrderPartStep } from "@/app/(protected)/_components/steps/select-service-order-part-step";

import {
  UpdateServiceOrderPartFormState,
  UpdateServiceOrderPartFormProps,
  UpdateServiceOrderPartFormSubmitProps,
} from "./dto";
import { appendDataToForm } from "@/lib/append-data-form";

const UpdateServiceOrderPartFormSubmit = ({
  state,
  onBack,
  serviceOrderPartData,
  isBusinessAndEntityDirty,
  isUpdateServiceOrderPartOpen,
  initialFormValues,
  onFormValuesChange,
}: UpdateServiceOrderPartFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Helper function to compute original values
  const computeOriginalValues = (): Record<string, string | number> => {
    const formattedUnitPrice =
      typeof serviceOrderPartData.unit_price === "number"
        ? formatToBrazilianCurrency(serviceOrderPartData.unit_price)
        : serviceOrderPartData.unit_price;

    let discountValue: string | number | null | undefined =
      serviceOrderPartData.discount_percentage;

    // Handle null/undefined/0 case - treat 0 as empty since it's optional
    if (
      discountValue == null ||
      discountValue === 0 ||
      discountValue === "0" ||
      discountValue === "0.0"
    ) {
      return {
        unit_price: formattedUnitPrice,
        quantity: serviceOrderPartData.quantity,
        discount_percentage: "",
      };
    }

    if (typeof discountValue === "string" && discountValue.includes("%")) {
      discountValue = discountValue.replace("%", "").trim();
    }

    try {
      const stringValue = String(discountValue);
      const numericValue = parseFloat(stringValue.replace(",", "."));

      if (!isNaN(numericValue)) {
        discountValue = numericValue.toFixed(1).replace(".", ",");
      }
    } catch (error) {}

    return {
      unit_price: formattedUnitPrice,
      quantity: serviceOrderPartData.quantity,
      discount_percentage: String(discountValue),
    };
  };

  const [originalValues, setOriginalValues] = useState<
    Record<string, string | number>
  >(() => computeOriginalValues());

  const [_, setFormValues] = useState<Record<string, string | number>>(() => {
    if (Object.keys(initialFormValues).length > 0) {
      return {
        unit_price: initialFormValues.unit_price || "",
        quantity: initialFormValues.quantity
          ? Number(initialFormValues.quantity)
          : 1,
        discount_percentage: initialFormValues.discount_percentage || "",
      };
    }
    return computeOriginalValues();
  });

  const [isDirty, setIsDirty] = useState<boolean>(() => {
    if (Object.keys(initialFormValues).length > 0) {
      const original = computeOriginalValues();
      const formattedOriginalUnitPrice =
        typeof original.unit_price === "number"
          ? formatToBrazilianCurrency(original.unit_price)
          : original.unit_price;

      return (
        initialFormValues.unit_price !== formattedOriginalUnitPrice ||
        initialFormValues.quantity !== String(original.quantity) ||
        initialFormValues.discount_percentage !== original.discount_percentage
      );
    }
    return false;
  });

  const [quantityInputValue, setQuantityInputValue] = useState<string>(() => {
    if (initialFormValues.quantity !== undefined) {
      return initialFormValues.quantity;
    }
    return serviceOrderPartData.quantity.toString();
  });

  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>(() => {
    if (initialFormValues.unit_price !== undefined) {
      return initialFormValues.unit_price;
    }
    return typeof serviceOrderPartData.unit_price === "number"
      ? formatToBrazilianCurrency(serviceOrderPartData.unit_price)
      : serviceOrderPartData.unit_price;
  });

  const [displayDiscountPercentage, setDisplayDiscountPercentage] =
    useState<string>(() => {
      if (initialFormValues.discount_percentage !== undefined) {
        return initialFormValues.discount_percentage;
      }

      let discountValue: string | number | null | undefined =
        serviceOrderPartData.discount_percentage;

      // Handle null/undefined/0 case - treat 0 as empty since it's optional
      if (
        discountValue == null ||
        discountValue === 0 ||
        discountValue === "0" ||
        discountValue === "0.0"
      ) {
        return "";
      }

      if (typeof discountValue === "string" && discountValue.includes("%")) {
        discountValue = discountValue.replace("%", "").trim();
      }

      try {
        const stringValue = String(discountValue);
        const numericValue = parseFloat(stringValue.replace(",", "."));

        if (!isNaN(numericValue)) {
          discountValue = numericValue.toFixed(1).replace(".", ",");
        }
      } catch (error) {}

      return String(discountValue);
    });

  useEffect(() => {
    if (
      serviceOrderPartData &&
      isUpdateServiceOrderPartOpen &&
      Object.keys(initialFormValues).length === 0
    ) {
      const original = computeOriginalValues();
      setOriginalValues(original);

      setFormValues(original);
      setQuantityInputValue(serviceOrderPartData.quantity.toString());

      setDisplayUnitPrice(
        typeof serviceOrderPartData.unit_price === "number"
          ? formatToBrazilianCurrency(serviceOrderPartData.unit_price)
          : serviceOrderPartData.unit_price,
      );

      let discountValue: string | number | null | undefined =
        serviceOrderPartData.discount_percentage;

      // Handle null/undefined/0 case
      if (
        discountValue == null ||
        discountValue === 0 ||
        discountValue === "0" ||
        discountValue === "0.0"
      ) {
        setDisplayDiscountPercentage("");
      } else {
        if (typeof discountValue === "string" && discountValue.includes("%")) {
          discountValue = discountValue.replace("%", "").trim();
        }

        try {
          const stringValue = String(discountValue);
          const numericValue = parseFloat(stringValue.replace(",", "."));

          if (!isNaN(numericValue)) {
            discountValue = numericValue.toFixed(1).replace(".", ",");
          }
        } catch (error) {}

        setDisplayDiscountPercentage(String(discountValue));
      }
    }
  }, [serviceOrderPartData, isUpdateServiceOrderPartOpen, initialFormValues]);

  // Function to save form values and go back
  const handleBack = () => {
    const allFormValues: Record<string, string> = {
      unit_price: displayUnitPrice,
      quantity: quantityInputValue,
      discount_percentage: displayDiscountPercentage,
    };
    onFormValuesChange(allFormValues);
    onBack();
  };

  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormValues((prev) => {
      let processedValue = value;

      if (typeof value === "string" && ["quantity"].includes(fieldName)) {
        processedValue = value === "" ? "" : Number(value);
      }

      const newValues = { ...prev, [fieldName]: processedValue };

      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue = originalValues[key];

        // Special handling for unit_price (currency)
        if (key === "unit_price") {
          const currentNumeric = formatCurrencyToNumber(val as string);
          const originalNumeric =
            typeof originalValue === "number"
              ? originalValue
              : formatCurrencyToNumber(originalValue as string);

          return currentNumeric !== originalNumeric;
        }

        // Special handling for discount_percentage - compare numeric values
        if (key === "discount_percentage") {
          const currentStr = String(val || "");
          const originalStr = String(originalValue || "");

          // Both empty means no change
          if (currentStr === "" && originalStr === "") {
            return false;
          }

          // One empty and one not means change
          if (currentStr === "" || originalStr === "") {
            return true;
          }

          // Compare numeric values
          const currentNumeric = parseFloat(currentStr.replace(",", "."));
          const originalNumeric = parseFloat(originalStr.replace(",", "."));

          if (isNaN(currentNumeric) && isNaN(originalNumeric)) {
            return false;
          }

          if (isNaN(currentNumeric) || isNaN(originalNumeric)) {
            return true;
          }

          return currentNumeric !== originalNumeric;
        }

        if (typeof originalValue === "number" && typeof val === "number") {
          return originalValue !== val;
        }

        if (typeof originalValue === "string" && typeof val === "string") {
          const normalizeValue = (v: string) => v.replace(/[^0-9,.]/g, "");
          return normalizeValue(originalValue) !== normalizeValue(val);
        }

        return originalValue !== val;
      });

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the raw input value
    const value = e.target.value;

    // Allow the field to be completely empty while typing
    if (value === "") {
      setQuantityInputValue("");
      handleFieldChange("quantity", "");

      return;
    }

    // Check for zero as the first character when the field was previously empty
    if (quantityInputValue === "" && value === "0") {
      setQuantityInputValue("1");
      handleFieldChange("quantity", 1);

      return;
    }

    // Only allow positive integers
    const cleanValue = value.replace(/[^\d]/g, "");

    // If the resulting value is empty after removing non-digits, keep it empty
    if (cleanValue === "") {
      setQuantityInputValue("");
      handleFieldChange("quantity", "");

      return;
    }

    // Remove leading zeros by converting to number and back to string
    const normalizedValue = parseInt(cleanValue, 10).toString();

    // For valid numbers, update both the input value and the actual quantity
    const numValue = parseInt(normalizedValue, 10);

    // Only enforce the upper limit (we'll enforce the lower limit on blur)
    if (numValue <= 9999) {
      setQuantityInputValue(normalizedValue);
      handleFieldChange("quantity", numValue);
    } else {
      setQuantityInputValue("9999");
      handleFieldChange("quantity", 9999);
    }
  };

  const handleUnitPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayUnitPrice(inputValue);
    handleFieldChange("unit_price", inputValue);
  };

  const handleUnitPriceBlur = (): void => {
    if (
      !displayUnitPrice ||
      displayUnitPrice === "," ||
      displayUnitPrice === "."
    ) {
      setDisplayUnitPrice("");
      handleFieldChange("unit_price", "");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayUnitPrice);
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayUnitPrice(formattedValue);
    handleFieldChange("unit_price", formattedValue);
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
      handleFieldChange("discount_percentage", "");

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
      const formattedValue = inputValue.replace(".", ",");

      setDisplayDiscountPercentage(formattedValue);
      handleFieldChange("discount_percentage", formattedValue);
    }
  };

  // Update to the handleDiscountPercentageBlur function
  const handleDiscountPercentageBlur = (): void => {
    // If the field is empty, keep it empty
    if (!displayDiscountPercentage || displayDiscountPercentage === "") {
      setDisplayDiscountPercentage("");

      handleFieldChange("discount_percentage", "");
      return;
    }

    // If only commas or periods, clear the field
    if (
      displayDiscountPercentage === "," ||
      displayDiscountPercentage === "."
    ) {
      setDisplayDiscountPercentage("");
      handleFieldChange("discount_percentage", "");

      return;
    }

    // Convert to number for consistent formatting
    const numericValue = parseFloat(
      displayDiscountPercentage.replace(",", "."),
    );

    if (isNaN(numericValue)) {
      setDisplayDiscountPercentage("");
      handleFieldChange("discount_percentage", "");

      return;
    }

    // If value is 0, clear the field (treat as no discount)
    if (numericValue === 0) {
      setDisplayDiscountPercentage("");
      handleFieldChange("discount_percentage", "");
      return;
    }

    // Format with one decimal place, using Brazilian format (comma as decimal separator)
    const formattedValue = numericValue.toFixed(1).replace(".", ",");

    setDisplayDiscountPercentage(formattedValue);
    handleFieldChange("discount_percentage", formattedValue);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <FormInput
          label={"Preço Unitário *"}
          htmlfor={"unit_price"}
          name="unit_price"
          type="text"
          errorName={state.updateServiceOrderPartError?.unit_price}
          value={displayUnitPrice}
          onChange={handleUnitPriceChange}
          onBlur={handleUnitPriceBlur}
          placeholder={"R$ 0,00"}
          disabled={pending}
        />

        <FormInput
          label={"Quantidade *"}
          htmlfor={"quantity"}
          name="quantity"
          type="text"
          errorName={state.updateServiceOrderPartError?.quantity}
          value={quantityInputValue}
          onChange={handleQuantityChange}
          placeholder={"Ex: 1"}
          disabled={pending}
        />

        <FormInput
          label={"Percentual de Desconto (%) (opcional)"}
          htmlfor={"discount_percentage"}
          name="discount_percentage"
          type="text"
          errorName={state.updateServiceOrderPartError?.discount_percentage}
          value={displayDiscountPercentage}
          onChange={handleDiscountPercentageChange}
          onBlur={handleDiscountPercentageBlur}
          placeholder={"0,0"}
          disabled={pending}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || (!isDirty && !isBusinessAndEntityDirty)}
        >
          <span>Editar Ordem de Serviço da Peça</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </>
  );
};

const UpdateServiceOrderPartForm = ({
  serviceOrderPartData,
  handleCloseUpdateServiceOrderPart,
  isUpdateServiceOrderPartOpen,
}: UpdateServiceOrderPartFormProps): JSX.Element => {
  const defaultState: UpdateServiceOrderPartFormState = {};
  const [state, dispatch] = useFormState<
    UpdateServiceOrderPartFormState,
    FormData
  >(handleUpdateServiceOrderPart, defaultState);

  const {
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
  } = useUpdateServiceOrderPartForm({
    state,
    handleCloseUpdateServiceOrderPart,
    serviceOrderPartData,
    isUpdateServiceOrderPartOpen,
  });

  const updateServiceOrderPartForm = (serviceOrderPartFormData: FormData) => {
    const updateServiceOrderPartData = {
      serviceOrderPartId: serviceOrderPartData.id,
      businessId: commandBusinessInputValue.businessId,
      serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
      partId: commandPartInputValue.partId,
    };

    appendDataToForm(serviceOrderPartFormData, updateServiceOrderPartData);
    return dispatch(serviceOrderPartFormData);
  };

  return (
    <Dialog
      open={isUpdateServiceOrderPartOpen}
      onOpenChange={() => {
        if (isUpdateServiceOrderPartOpen) {
          formRef.current?.reset();
        }
        handleCloseUpdateServiceOrderPart();
      }}
    >
      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : currentStep === "select-service-order-part"
                ? "Selecionar Ordem de Serviço e Peça"
                : "Editar Ordem de Serviço da Peça"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja atualizar a ordem de serviço da peça."
              : currentStep === "select-service-order-part"
                ? "Selecione a ordem de serviço e a peça para associar."
                : "Atualize as informações solicitadas para concluir a atualização da ordem de serviço da peça."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            errorBusinessId={state.updateServiceOrderPartError?.businessId}
          />
        ) : currentStep === "select-service-order-part" ? (
          <SelectServiceOrderPartStep
            businessId={commandBusinessInputValue.businessId}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            commandPartInputValue={commandPartInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
            onContinue={handleServiceOrderPartStepContinue}
            onBack={handleBackToBusinessStep}
            errorPartId={state.updateServiceOrderPartError?.partId}
            errorServiceOrderId={
              state.updateServiceOrderPartError?.serviceOrderId
            }
          />
        ) : (
          <form ref={formRef} action={updateServiceOrderPartForm}>
            <UpdateServiceOrderPartFormSubmit
              state={state}
              onBack={handleBackToServiceOrderPartStep}
              serviceOrderPartData={serviceOrderPartData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateServiceOrderPartOpen={isUpdateServiceOrderPartOpen}
              initialFormValues={serviceOrderPartFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateServiceOrderPartForm };
