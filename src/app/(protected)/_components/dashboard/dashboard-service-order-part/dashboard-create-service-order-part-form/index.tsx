import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import type {
  DashboardCreateServiceOrderPartFormState,
  DashboardCreateServiceOrderPartFormSubmitProps,
} from "./dashboard-create-service-order-part-form.types";
import { handleCreateServiceOrderPart } from "@/actions/service-order-part/create-service-order-part";

import { appendDataToForm } from "@/lib/append-data-form";

import { useAuthStore } from "@/store/auth-store";
import { permissions } from "@/lib/permissions";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SelectServiceOrderPartStep } from "@/app/(protected)/_components/shared/steps/select-service-order-part-step";
import { useDashboardCreateServiceOrderPartForm } from "./hooks";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

const DashboardCreateServiceOrderPartFormSubmit = ({
  state,
  onBack,
  initialFormValues,
  onFormValuesChange,
}: DashboardCreateServiceOrderPartFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Form field states with lazy initializers
  const [quantityInputValue, setQuantityInputValue] = useState<string>(
    () => initialFormValues.quantity || "",
  );
  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>(
    () => initialFormValues.unit_price || "",
  );

  const [displayDiscountPercentage, setDisplayDiscountPercentage] =
    useState<string>(() => initialFormValues.discount_percentage || "");

  // Quantity handlers
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === "") {
      setQuantityInputValue("");
      return;
    }

    // Check for zero as the first character when the field was previously empty
    if (quantityInputValue === "" && value === "0") {
      setQuantityInputValue("1");
      return;
    }

    // Only allow positive integers
    const cleanValue = value.replace(/[^\d]/g, "");

    if (cleanValue === "") {
      setQuantityInputValue("");
      return;
    }

    // Remove leading zeros by converting to number and back to string
    const normalizedValue = parseInt(cleanValue, 10).toString();
    const numValue = parseInt(normalizedValue, 10);

    if (numValue <= 9999) {
      setQuantityInputValue(normalizedValue);
    } else {
      setQuantityInputValue("9999");
    }
  };

  // Unit price handlers
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

  // Discount percentage handlers
  const handleDiscountPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    let inputValue = e.target.value;

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

  const handleDiscountPercentageBlur = (): void => {
    if (!displayDiscountPercentage || displayDiscountPercentage === "") {
      setDisplayDiscountPercentage("");
      return;
    }

    if (
      displayDiscountPercentage === "," ||
      displayDiscountPercentage === "."
    ) {
      setDisplayDiscountPercentage("");
      return;
    }

    const numericValue = parseFloat(
      displayDiscountPercentage.replace(",", "."),
    );

    if (isNaN(numericValue)) {
      setDisplayDiscountPercentage("");
      return;
    }

    // If value is 0, clear the field (treat as no discount)
    if (numericValue === 0) {
      setDisplayDiscountPercentage("");
      return;
    }

    // Format with one decimal place, using Brazilian format
    setDisplayDiscountPercentage(numericValue.toFixed(1).replace(".", ","));
  };

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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <FormInput
          label={"Preço Unitário *"}
          htmlfor={"unit_price"}
          name="unit_price"
          type="text"
          errorName={state.createServiceOrderPartError?.unit_price}
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
          errorName={state.createServiceOrderPartError?.quantity}
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
          errorName={state.createServiceOrderPartError?.discount_percentage}
          value={displayDiscountPercentage}
          onChange={handleDiscountPercentageChange}
          onBlur={handleDiscountPercentageBlur}
          placeholder={"Ex: 5,0"}
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
        <Button type="submit" disabled={pending}>
          <span>Criar Ordem de Serviço da Peça</span>
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

const DashboardCreateServiceOrderPartForm = (): JSX.Element => {
  const defaultState: DashboardCreateServiceOrderPartFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateServiceOrderPartFormState,
    FormData
  >(handleCreateServiceOrderPart, defaultState);

  const {
    isCreateServiceOrderPartForm,
    formRef,
    currentStep,
    commandServiceOrderInputValue,
    commandPartInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchPartInputValue,
    handleServiceOrderPartStepContinue,
    handleBackToServiceOrderPartStep,
    handleCloseDialog,
    serviceOrderPartFormValues,
    handleFormValuesChange,
  } = useDashboardCreateServiceOrderPartForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_PART_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_PART_MANAGE),
    },
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
    },
    {
      key: permissions.PART_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PART_MANAGE),
    },
  ]);

  const createServiceOrderPartForm = (serviceOrderPartFormData: FormData) => {
    const serviceOrderPartData = {
      businessId: businessId as string,
      serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
      partId: commandPartInputValue.partId,
    };

    appendDataToForm(serviceOrderPartFormData, serviceOrderPartData);
    return dispatch(serviceOrderPartFormData);
  };

  return (
    <Dialog
      open={isCreateServiceOrderPartForm}
      onOpenChange={handleCloseDialog}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
                data-tutorial="create-button"
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Ordem de Serviço por Peça
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {!permissionsRequired.hasAllPermissions && (
            <TooltipContent className="max-w-sm">
              <p>{permissionsRequired.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-service-order-part"
              ? "Selecionar Ordem de Serviço e Peça"
              : "Criar Ordem de Serviço de Peça"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-service-order-part"
              ? "Selecione a ordem de serviço e a peça para associar."
              : "Insira as informações solicitadas para concluir a criação da ordem de serviço de peça."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-service-order-part" ? (
          <SelectServiceOrderPartStep
            businessId={businessId as string}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            commandPartInputValue={commandPartInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
            onContinue={handleServiceOrderPartStepContinue}
            errorPartId={state.createServiceOrderPartError?.partId}
            errorServiceOrderId={
              state.createServiceOrderPartError?.serviceOrderId
            }
          />
        ) : (
          <form ref={formRef} action={createServiceOrderPartForm}>
            <DashboardCreateServiceOrderPartFormSubmit
              state={state}
              onBack={handleBackToServiceOrderPartStep}
              initialFormValues={serviceOrderPartFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateServiceOrderPartForm };
