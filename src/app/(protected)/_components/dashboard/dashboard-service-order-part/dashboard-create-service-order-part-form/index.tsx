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
import FormInput from "@/components/custom/form-input";

import { handleCreateServiceOrderPart } from "@/actions/create-service-order-part";

import {
  DashboardCreateServiceOrderPartFormState,
  DashboardCreateServiceOrderPartFormSubmitProps,
} from "./dto";

import { useDashboardCreateServiceOrderPartForm } from "./hooks";

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
import { SelectServiceOrderPartStep } from "@/app/(protected)/_components/steps/select-service-order-part-step";

const CreateServiceOrderPartFormSubmit = ({
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
}: DashboardCreateServiceOrderPartFormSubmitProps): JSX.Element => {
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
            <CreateServiceOrderPartFormSubmit
              state={state}
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
