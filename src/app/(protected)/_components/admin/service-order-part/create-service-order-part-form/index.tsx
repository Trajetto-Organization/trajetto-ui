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
  CreateServiceOrderPartFormState,
  CreateServiceOrderPartContainerProps,
  SelectBusinessStepProps,
  SelectServiceOrderPartStepProps,
} from "./dto";

import { useCreateServiceOrderPartForm } from "./hooks";
import { cn } from "@/lib/utils";

import { SearchBusiness } from "../../../search-business";

import { SearchServiceOrder } from "../../../search-service-order";
import { SearchPart } from "../../../search-part";

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
          errorBusinessId={state.createServiceOrderPartError?.businessId}
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

// Step 3: Create Service Order Part Form
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
}: CreateServiceOrderPartContainerProps): JSX.Element => {
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
  const [state, dispatch] = useFormState(handleCreateServiceOrderPart, null);

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
        <Button size="sm" className="h-8">
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
                businessId: commandBusinessInputValue.businessId,
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

export { CreateServiceOrderPartForm };
