import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateServiceOrderPart } from "@/actions/create-service-order-part";

import {
  DashboardCreateServiceOrderPartFormState,
  DashboardCreateServiceOrderPartContainerProps,
  DashboardSelectServiceOrderPartStepProps,
} from "./dto";

import { useDashboardCreateServiceOrderPartForm } from "./hooks";
import { cn } from "@/lib/utils";

import { SearchServiceOrder } from "../../../search-service-order";
import { SearchPart } from "../../../search-part";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { useAuthStore } from "@/store/auth-store";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { permissions } from "@/lib/permissions";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Step 1: Select Service Order and Part
const SelectServiceOrderPartStep = ({
  state,
  businessId,
  commandServiceOrderInputValue,
  commandPartInputValue,
  handleUpdateSearchServiceOrderInputValue,
  handleUpdateSearchPartInputValue,
  onContinue,
}: DashboardSelectServiceOrderPartStepProps) => {
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
              state.createServiceOrderPartError?.serviceOrderId
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
            errorPartId={state.createServiceOrderPartError?.partId}
            searchPartInputValue={commandPartInputValue.searchPartInputValue}
            businessId={businessId}
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
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

// Step 2: Create Service Order Part Form
const CreateServiceOrderPartFormContainer = ({
  state,
  onBack,
  quantityInputValue,
  displayUnitPrice,
  displayDiscountPercentage,
  handleQuantityChange,
  handleUnitPriceChange,
  handleUnitPriceBlur,
  handleDiscountPercentageChange,
  handleDiscountPercentageBlur,
  handleQuantityBlur,
}: DashboardCreateServiceOrderPartContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <FormInput
          label={"Preço Unitário"}
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
          label={"Quantidade"}
          htmlfor={"quantity"}
          name="quantity"
          type="text"
          errorName={state.createServiceOrderPartError?.quantity}
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
          errorName={state.createServiceOrderPartError?.discount_percentage}
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
  const [state, dispatch] = useFormState(handleCreateServiceOrderPart, null);

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
    quantityInputValue,
    displayUnitPrice,
    displayDiscountPercentage,
    handleQuantityChange,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    handleDiscountPercentageChange,
    handleDiscountPercentageBlur,
    handleQuantityBlur,
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

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            state={state ?? defaultState}
            businessId={businessId as string}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            commandPartInputValue={commandPartInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
            onContinue={handleServiceOrderPartStepContinue}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                businessId: businessId as string,
                serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
                partId: commandPartInputValue.partId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <CreateServiceOrderPartFormContainer
              state={state ?? defaultState}
              onBack={handleBackToServiceOrderPartStep}
              quantityInputValue={quantityInputValue}
              displayUnitPrice={displayUnitPrice}
              displayDiscountPercentage={displayDiscountPercentage}
              handleQuantityChange={handleQuantityChange}
              handleUnitPriceChange={handleUnitPriceChange}
              handleUnitPriceBlur={handleUnitPriceBlur}
              handleDiscountPercentageChange={handleDiscountPercentageChange}
              handleDiscountPercentageBlur={handleDiscountPercentageBlur}
              handleQuantityBlur={handleQuantityBlur}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateServiceOrderPartForm };
