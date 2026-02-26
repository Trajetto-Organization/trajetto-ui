import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

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

import { Loader } from "lucide-react";
import { DatePickerField } from "../../../custom";

import {
  CreateAccountPayableFormState,
  CreateAccountPayableFormSubmitProps,
} from "./dto";
import { handleCreateAccountPayable } from "@/actions/account-payable/create-account-payable";

import { useCreateAccountPayableForm } from "./hooks";
import { appendDataToForm } from "@/lib/append-data-form";

import { SelectUserStep } from "@/app/(protected)/_components/steps/select-user-step";
import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";

import { SelectServiceOrderStep } from "@/app/(protected)/_components/steps/select-service-order-step";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

const CreateAccountPayableFormSubmit = ({
  state,
  onBack,
  initialFormValues,
  onFormValuesChange,
}: CreateAccountPayableFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Form field states with lazy initializers
  const [displayAmount, setDisplayAmount] = useState<string>(
    () => initialFormValues.amount || "",
  );

  const [displayAmountPaid, setDisplayAmountPaid] = useState<string>(
    () => initialFormValues.amount_paid || "",
  );

  const [dueDate, setDueDate] = useState<string>(
    () => initialFormValues.due_date || "",
  );

  const [paymentDate, setPaymentDate] = useState<string>(
    () => initialFormValues.payment_date || "",
  );

  // Amount handlers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayAmount(inputValue);
  };

  const handleAmountBlur = (): void => {
    if (!displayAmount || displayAmount === "," || displayAmount === ".") {
      setDisplayAmount("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayAmount);
    setDisplayAmount(formatToBrazilianCurrency(newNumericValue));
  };

  // Amount paid handlers
  const handleAmountPaidChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayAmountPaid(inputValue);
  };

  const handleAmountPaidBlur = (): void => {
    if (
      !displayAmountPaid ||
      displayAmountPaid === "," ||
      displayAmountPaid === "."
    ) {
      setDisplayAmountPaid("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayAmountPaid);
    setDisplayAmountPaid(formatToBrazilianCurrency(newNumericValue));
  };

  // Date handlers
  const handleDueDateChange = (value: string): void => {
    setDueDate(value);
  };

  const handlePaymentDateChange = (value: string): void => {
    setPaymentDate(value);
  };

  // Function to save form values and go back
  const handleBack = () => {
    const allFormValues: Record<string, string> = {
      amount: displayAmount,
      amount_paid: displayAmountPaid,
      due_date: dueDate,
      payment_date: paymentDate,
    };

    onFormValuesChange(allFormValues);
    onBack();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Due Date */}
        <DatePickerField
          label="Data de vencimento *"
          htmlfor="due_date"
          name="due_date"
          value={dueDate}
          onChange={handleDueDateChange}
          errorName={state.createAccountPayableError?.due_date}
          allowFutureDates={true}
          disabled={pending}
        />

        {/* Payment Date - Optional */}
        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={paymentDate}
          onChange={handlePaymentDateChange}
          errorName={state.createAccountPayableError?.payment_date}
          allowFutureDates={true}
          disabled={pending}
        />

        {/* Amount */}
        <FormInput
          label="Valor total *"
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
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending}
        >
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
  const [state, dispatch] = useFormState<
    CreateAccountPayableFormState,
    FormData
  >(handleCreateAccountPayable, defaultState);

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
    accountPayableFormValues,
    handleFormValuesChange,
  } = useCreateAccountPayableForm(state);

  const createAccountPayableForm = (accountPayableFormData: FormData) => {
    const accountPayableData = {
      businessId: commandBusinessInputValue.businessId,
      branchId: commandBranchInputValue.branchId,
      serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
      registrationUserId: commandUserInputValue.userId,
    };

    appendDataToForm(accountPayableFormData, accountPayableData);
    return dispatch(accountPayableFormData);
  };

  return (
    <Dialog open={isCreateAccountPayableForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Conta a Pagar
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
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
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBusinessId={state?.createAccountPayableError?.businessId}
            errorBranchId={state?.createAccountPayableError?.branchId}
          />
        ) : currentStep === "select-service-order" ? (
          <SelectServiceOrderStep
            businessId={commandBusinessInputValue.businessId}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            onContinue={handleServiceOrderStepContinue}
            onBack={handleBackToBusinessBranchStep}
            errorServiceOrderId={
              state?.createAccountPayableError?.serviceOrderId
            }
            searchServiceOrderIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={commandBusinessInputValue.businessId}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToServiceOrderStep}
            errorUserId={state?.createAccountPayableError?.registrationUserId}
          />
        ) : (
          <form ref={formRef} action={createAccountPayableForm}>
            <CreateAccountPayableFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              initialFormValues={accountPayableFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateAccountPayableForm };
