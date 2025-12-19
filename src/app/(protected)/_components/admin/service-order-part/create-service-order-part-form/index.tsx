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
  CreateServiceOrderPartFormState,
  CreateServiceOrderPartFormSubmitProps,
} from "./dto";

import { useCreateServiceOrderPartForm } from "./hooks";

import { SelectBusinessStep } from "@/app/(protected)/_components/steps/select-business-step";
import { SelectServiceOrderPartStep } from "@/app/(protected)/_components/steps/select-service-order-part-step";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

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
}: CreateServiceOrderPartFormSubmitProps): JSX.Element => {
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

const CreateServiceOrderPartForm = (): JSX.Element => {
  const defaultState: CreateServiceOrderPartFormState = {};
  const [state, dispatch] = useFormState<
    CreateServiceOrderPartFormState,
    FormData
  >(handleCreateServiceOrderPart, defaultState);

  const {
    isCreateServiceOrderPartForm,
    formRef,
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
    quantityInputValue,
    displayUnitPrice,
    displayDiscountPercentage,
    handleQuantityChange,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    handleDiscountPercentageChange,
    handleDiscountPercentageBlur,
    handleQuantityBlur,
  } = useCreateServiceOrderPartForm(state);

  return (
    <Dialog
      open={isCreateServiceOrderPartForm}
      onOpenChange={handleCloseDialog}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Ordem de Serviço por Peça
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : currentStep === "select-service-order-part"
                ? "Selecionar Ordem de Serviço e Peça"
                : "Criar Ordem de Serviço de Peça"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja criar uma ordem de serviço de peça."
              : currentStep === "select-service-order-part"
                ? "Selecione a ordem de serviço e a peça para associar."
                : "Insira as informações solicitadas para concluir a criação da ordem de serviço de peça."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            errorBusinessId={state.createServiceOrderPartError?.businessId}
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
                businessId: commandBusinessInputValue.businessId,
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

export { CreateServiceOrderPartForm };
