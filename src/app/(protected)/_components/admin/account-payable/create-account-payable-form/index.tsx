import { useState } from "react";
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

import {
  CreateAccountPayableContainerProps,
  CreateAccountPayableFormState,
  SelectBusinessBranchStepProps,
  SelectServiceOrderStepProps,
  SelectUserStepProps,
} from "./dto";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateAccountPayable } from "@/actions/create-account-payable";

import { cn } from "@/lib/utils";
import { DatePickerField } from "../../../custom";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchServiceOrder } from "../../../search-service-order";
import { SearchUser } from "../../../search-user";

import { useCreateAccountPayableForm } from "./hooks";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

// Step 1: Select Business and Branch
const SelectBusinessBranchStep = ({
  state,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: SelectBusinessBranchStepProps) => {
  return (
    <div className="space-y-6">
      {(searchBranchInputValue || searchBusinessInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
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

          {searchBranchInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Filial:</span>
                <span className="w-full truncate">
                  {searchBranchInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBranchInputValue({
                    branchId: "",
                    searchBranchInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={`grid ${
          searchBusinessInputValue
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        } gap-4`}
      >
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.createAccountPayableError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.createAccountPayableError?.branchId}
            searchBranchInputValue={searchBranchInputValue}
            businessId={businessId}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
          />
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue || !branchId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Service Order (Optional)
const SelectServiceOrderStep = ({
  state,
  businessId,
  commandServiceOrderInputValue,
  handleUpdateSearchServiceOrderInputValue,
  onContinue,
  onBack,
}: SelectServiceOrderStepProps) => {
  return (
    <div className="space-y-6">
      {/* Display selected Service Order if any */}
      {commandServiceOrderInputValue.searchServiceOrderInputValue && (
        <div className="grid grid-cols-1 w-full">
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
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Service Order Selection (Optional) */}
        <div>
          <SearchServiceOrder
            errorServiceOrderId={
              state.createAccountPayableError?.serviceOrderId
            }
            searchServiceOrderInputValue={
              commandServiceOrderInputValue.searchServiceOrderInputValue
            }
            businessId={businessId}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            isOptional={true}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Este campo é opcional. Você pode prosseguir sem selecionar uma ordem
            de serviço.
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" onClick={onContinue}>
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 3: Select User
const SelectUserStep = ({
  state,
  businessId,
  commandUserInputValue,
  handleUpdateSearchUserInputValue,
  onContinue,
  onBack,
}: SelectUserStepProps) => {
  return (
    <div className="space-y-6">
      {/* Display selected User if any */}
      {commandUserInputValue.searchUserInputValue && (
        <div className="grid grid-cols-1 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Usuário Responsável:</span>
              <span className="w-full truncate">
                {commandUserInputValue.searchUserInputValue}{" "}
                {commandUserInputValue.responsibleUserEmail && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (E-mail: {commandUserInputValue.responsibleUserEmail})
                  </span>
                )}
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchUserInputValue({
                  userId: "",
                  searchUserInputValue: "",
                  responsibleUserEmail: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      {/* User Selection (Required) */}
      <SearchUser
        errorUserId={state.createAccountPayableError?.registrationUserId}
        selectedUserId={commandUserInputValue.userId}
        businessId={businessId}
        handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!commandUserInputValue.userId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 4: Create Account Payable Form
const CreateAccountPayableFormContainer = ({
  state,
  onBack,
  displayAmount,
  displayAmountPaid,
  handleAmountChange,
  handleAmountBlur,
  handleAmountPaidChange,
  handleAmountPaidBlur,
}: CreateAccountPayableContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Due Date */}
        <DatePickerField
          label="Data de vencimento"
          htmlfor="due_date"
          name="due_date"
          value={formValues.due_date || ""}
          onChange={handleCustomFieldChange("due_date")}
          errorName={state.createAccountPayableError?.due_date}
          disabled={pending}
        />

        {/* Payment Date - Optional */}
        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={formValues.payment_date || ""}
          onChange={handleCustomFieldChange("payment_date")}
          errorName={state.createAccountPayableError?.payment_date}
          disabled={pending}
        />

        {/* Amount */}
        <FormInput
          label="Valor total"
          htmlfor="amount"
          name="amount"
          type="text"
          errorName={state.createAccountPayableError?.amount}
          value={displayAmount}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          placeholder="R$ 0,00"
          disabled={pending}
        />

        {/* Amount Paid - Optional */}
        <FormInput
          label="Valor pago (opcional)"
          htmlfor="amount_paid"
          name="amount_paid"
          type="text"
          errorName={state.createAccountPayableError?.amount_paid}
          value={displayAmountPaid}
          onChange={handleAmountPaidChange}
          onBlur={handleAmountPaidBlur}
          placeholder="R$ 0,00"
          disabled={pending}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" disabled={pending}>
          <span>Criar Conta a Pagar</span>
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

const CreateAccountPayableForm = (): JSX.Element => {
  const defaultState: CreateAccountPayableFormState = {};
  const [state, dispatch] = useFormState(handleCreateAccountPayable, null);

  const {
    isCreateAccountPayableForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    handleBusinessBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    displayAmount,
    displayAmountPaid,
    handleAmountChange,
    handleAmountBlur,
    handleAmountPaidChange,
    handleAmountPaidBlur,
  } = useCreateAccountPayableForm(state);

  return (
    <Dialog open={isCreateAccountPayableForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          Criar Conta a Pagar
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-service-order"
                ? "Selecionar Ordem de Serviço (Opcional)"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Criar Nova Conta a Pagar"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja criar uma conta a pagar."
              : currentStep === "select-service-order"
                ? "Selecione opcionalmente uma ordem de serviço para associar à conta a pagar."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela conta a pagar."
                  : "Insira as informações solicitadas abaixo para concluir a criação da conta a pagar."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business-branch" ? (
          <SelectBusinessBranchStep
            state={state ?? defaultState}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : currentStep === "select-service-order" ? (
          <SelectServiceOrderStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            onContinue={handleServiceOrderStepContinue}
            onBack={handleBackToBusinessBranchStep}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToServiceOrderStep}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                businessId: commandBusinessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
                registrationUserId: commandUserInputValue.userId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <CreateAccountPayableFormContainer
              state={state ?? defaultState}
              onBack={handleBackToUserStep}
              displayAmount={displayAmount}
              displayAmountPaid={displayAmountPaid}
              handleAmountChange={handleAmountChange}
              handleAmountBlur={handleAmountBlur}
              handleAmountPaidChange={handleAmountPaidChange}
              handleAmountPaidBlur={handleAmountPaidBlur}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateAccountPayableForm };
