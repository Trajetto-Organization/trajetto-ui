import { useState, useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateServiceOrderPart } from "@/actions/update-service-order-part";

import { cn } from "@/lib/utils";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useUpdateServiceOrderPartForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { SearchServiceOrder } from "../../../search-service-order";

import { SearchPart } from "../../../search-part";

import {
  UpdateServiceOrderPartFormState,
  SelectBusinessStepProps,
  UpdateServiceOrderPartFormProps,
  SelectServiceOrderPartStepProps,
  UpdateServiceOrderPartContainerProps,
} from "./dto";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

// Step 1: Select Business
const SelectBusinessStep = ({
  state,
  handleUpdateSearchBusinessInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  onContinue,
}: SelectBusinessStepProps) => {
  return (
    <div className="space-y-6">
      {searchBusinessInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-left",
            )}
          >
            <span>Empresa:</span>
            <span className="w-full truncate">{searchBusinessInputValue}</span>
          </div>

          <Button
            className="h-8 w-4"
            variant="ghost"
            onClick={() =>
              handleUpdateSearchBusinessInputValue({
                businessId: "",
                searchBusinessInputValue: "",
              })
            }
          >
            <X />
          </Button>
        </div>
      )}

      <div className="w-full">
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.updateServiceOrderPartError?.businessId}
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue || !businessId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Service Order and Part
const SelectServiceOrderPartStep = ({
  state,
  businessId,
  commandServiceOrderInputValue,
  commandPartInputValue,
  handleUpdateSearchServiceOrderInputValue,
  handleUpdateSearchPartInputValue,
  onContinue,
  onBack,
}: SelectServiceOrderPartStepProps) => {
  return (
    <div className="space-y-6">
      {/* Display selected items */}
      {(commandServiceOrderInputValue.searchServiceOrderInputValue ||
        commandPartInputValue.searchPartInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {commandServiceOrderInputValue.searchServiceOrderInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Ordem de Serviço:</span>
                <span className="w-full truncate">
                  {commandServiceOrderInputValue.searchServiceOrderInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchServiceOrderInputValue({
                    serviceOrderId: "",
                    searchServiceOrderInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {commandPartInputValue.searchPartInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Peça:</span>
                <span className="w-full truncate">
                  {commandPartInputValue.searchPartInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchPartInputValue({
                    partId: "",
                    searchPartInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service Order Selection */}
        <div>
          <SearchServiceOrder
            errorServiceOrderId={
              state.updateServiceOrderPartError?.serviceOrderId
            }
            searchServiceOrderInputValue={
              commandServiceOrderInputValue.searchServiceOrderInputValue
            }
            businessId={businessId}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
          />
        </div>

        {/* Part Selection */}
        <div>
          <SearchPart
            errorPartId={state.updateServiceOrderPartError?.partId}
            searchPartInputValue={commandPartInputValue.searchPartInputValue}
            businessId={businessId}
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            !commandServiceOrderInputValue.serviceOrderId ||
            !commandPartInputValue.partId
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 3: Update Service Order Part Form
const UpdateServiceOrderPartContainer = ({
  state,
  onBack,
  serviceOrderPartData,
  isBusinessAndEntityDirty,
  isUpdateServiceOrderPartOpen,
}: UpdateServiceOrderPartContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [originalValues, setOriginalValues] = useState<
    Record<string, string | number>
  >({});

  const [_, setFormValues] = useState<Record<string, string | number>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [quantityInputValue, setQuantityInputValue] = useState<string>("1");
  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>("");

  const [displayDiscountPercentage, setDisplayDiscountPercentage] =
    useState<string>("");

  useEffect(() => {
    if (serviceOrderPartData && isUpdateServiceOrderPartOpen) {
      setQuantityInputValue(serviceOrderPartData.quantity.toString());
      setDisplayUnitPrice(serviceOrderPartData.unit_price);

      let discountValue = serviceOrderPartData.discount_percentage;

      if (typeof discountValue === "string" && discountValue.includes("%")) {
        discountValue = discountValue.replace("%", "").trim();
      }

      try {
        const numericValue = parseFloat(discountValue.replace(",", "."));
        if (!isNaN(numericValue)) {
          discountValue = numericValue.toFixed(1).replace(".", ",");
        }
      } catch (error) {}

      setDisplayDiscountPercentage(discountValue);

      // Armazenar valores do formulário
      const initialValues = {
        unit_price: serviceOrderPartData.unit_price,
        quantity: serviceOrderPartData.quantity,
        discount_percentage: discountValue,
      };

      // Armazenar valores originais para comparação posterior
      setOriginalValues(initialValues);
      setFormValues(initialValues);
    }
  }, [serviceOrderPartData, isUpdateServiceOrderPartOpen]);

  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormValues((prev) => {
      let processedValue = value;

      if (typeof value === "string" && ["quantity"].includes(fieldName)) {
        processedValue = value === "" ? "" : Number(value);
      }

      const newValues = { ...prev, [fieldName]: processedValue };

      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue = originalValues[key];

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

  // Add a blur handler to ensure valid values when leaving the field
  const handleQuantityBlur = () => {
    // If empty when leaving the field, set to the minimum value
    if (quantityInputValue === "") {
      setQuantityInputValue("1");
      handleFieldChange("quantity", 1);
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

    // Format with one decimal place, using Brazilian format (comma as decimal separator)
    const formattedValue = numericValue.toFixed(1).replace(".", ",");

    setDisplayDiscountPercentage(formattedValue);
    handleFieldChange("discount_percentage", formattedValue);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <FormInput
          label={"Preço Unitário"}
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
          label={"Quantidade"}
          htmlfor={"quantity"}
          name="quantity"
          type="text"
          errorName={state.updateServiceOrderPartError?.quantity}
          value={quantityInputValue}
          onChange={handleQuantityChange}
          onBlur={handleQuantityBlur}
          placeholder={"1"}
          disabled={pending}
        />

        <FormInput
          label={"Percentual de Desconto (%)"}
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
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || (!isDirty && !isBusinessAndEntityDirty)}
        >
          <span>Atualizar Ordem de Serviço da Peça</span>
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
  const [state, dispatch] = useFormState(handleUpdateServiceOrderPart, null);

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
  } = useUpdateServiceOrderPartForm({
    state,
    handleCloseUpdateServiceOrderPart,
    serviceOrderPartData,
    isUpdateServiceOrderPartOpen,
  });

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
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : currentStep === "select-service-order-part"
                ? "Selecionar Ordem de Serviço e Peça"
                : "Atualizar Ordem de Serviço da Peça"}
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
            state={state ?? defaultState}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
          />
        ) : currentStep === "select-service-order-part" ? (
          <SelectServiceOrderPartStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            commandPartInputValue={commandPartInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
            onContinue={handleServiceOrderPartStepContinue}
            onBack={handleBackToBusinessStep}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                serviceOrderPartId: serviceOrderPartData.id,
                businessId: commandBusinessInputValue.businessId,
                serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
                partId: commandPartInputValue.partId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateServiceOrderPartContainer
              state={state ?? defaultState}
              onBack={handleBackToServiceOrderPartStep}
              serviceOrderPartData={serviceOrderPartData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateServiceOrderPartOpen={isUpdateServiceOrderPartOpen}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateServiceOrderPartForm };
