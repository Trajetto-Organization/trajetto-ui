import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { handleUpdateAccountPayable } from "@/actions/account-payable/update-account-payable";
import { useUpdateAccountPayableForm } from "./hooks";

import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";
import { SelectBusinessBranchStep } from "@/app/(protected)/_components/shared/steps/select-business-branch-step";

import { SelectServiceOrderStep } from "@/app/(protected)/_components/shared/steps/select-service-order-step";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { ACCOUNT_PAYABLE_CATEGORY_OPTIONS } from "@/lib/account-payable-category";

import type {
  UpdateAccountPayableFormState,
  UpdateAccountPayableFormProps,
  UpdateAccountPayableFormSubmitProps,
} from "./update-account-payable-form.types";
import { appendDataToForm } from "@/lib/append-data-form";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

const UpdateAccountPayableFormSubmit = ({
  state,
  onBack,
  isBusinessAndEntityDirty,
  accountPayableData,
  initialFormValues,
  onFormValuesChange,
}: UpdateAccountPayableFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Form field states with lazy initializers
  const [displayAmount, setDisplayAmount] = useState<string>(
    () =>
      initialFormValues.amount ??
      formatToBrazilianCurrency(accountPayableData.amount),
  );

  const [displayAmountPaid, setDisplayAmountPaid] = useState<string>(
    () =>
      initialFormValues.amount_paid ??
      (accountPayableData.amount_paid
        ? formatToBrazilianCurrency(accountPayableData.amount_paid)
        : ""),
  );

  const [dueDate, setDueDate] = useState<string>(
    () => initialFormValues.due_date ?? accountPayableData.due_date,
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    () =>
      initialFormValues.payment_date ?? (accountPayableData.payment_date || ""),
  );

  const [category, setCategory] = useState<string>(
    () => initialFormValues.category ?? (accountPayableData.category || ""),
  );

  const [categoryDescription, setCategoryDescription] = useState<string>(
    () =>
      initialFormValues.category_description ??
      (accountPayableData.category_description || ""),
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
      category,
      category_description: categoryDescription,
    };

    onFormValuesChange(allFormValues);
    onBack();
  };

  // Dirty checking for form fields
  const isDirty = [
    formatCurrencyToNumber(displayAmount) !== accountPayableData.amount,
    formatCurrencyToNumber(displayAmountPaid) !==
      (accountPayableData.amount_paid || 0),
    dueDate !== accountPayableData.due_date,
    paymentDate !== (accountPayableData.payment_date || ""),
    category !== (accountPayableData.category || ""),
    categoryDescription !== (accountPayableData.category_description || ""),
  ].some(Boolean);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Category */}
        <SelectField
          key={category}
          label="Categoria *"
          htmlfor="category"
          name="category"
          value={category}
          errorName={state.updateAccountPayableError?.category}
          disabled={pending}
          placeholder="Selecione a categoria da conta"
          options={ACCOUNT_PAYABLE_CATEGORY_OPTIONS}
          onChange={setCategory}
        />

        {/* Category description - only meaningful with OTHER */}
        {category === "OTHER" && (
          <FormInput
            label="Descrição da categoria *"
            htmlfor="category_description"
            name="category_description"
            type="text"
            errorName={state.updateAccountPayableError?.category_description}
            value={categoryDescription}
            onChange={(e) => setCategoryDescription(e.target.value)}
            placeholder="Ex.: taxa de licenciamento"
            disabled={pending}
          />
        )}

        {/* Due Date */}
        <DatePickerField
          label="Data de vencimento *"
          htmlfor="due_date"
          name="due_date"
          value={dueDate}
          onChange={handleDueDateChange}
          errorName={state.updateAccountPayableError?.due_date}
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
          errorName={state.updateAccountPayableError?.payment_date}
          allowFutureDates={true}
          disabled={pending}
        />

        {/* Amount */}
        <FormInput
          label="Valor total *"
          htmlfor="amount"
          name="amount"
          type="text"
          errorName={state.updateAccountPayableError?.amount}
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
          errorName={state.updateAccountPayableError?.amount_paid}
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
        <Button
          type="submit"
          disabled={pending || (!isDirty && !isBusinessAndEntityDirty)}
        >
          <span>Editar Conta a Pagar</span>
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

const UpdateAccountPayableForm = ({
  accountPayableData,
  handleCloseUpdateAccountPayable,
  isUpdateAccountPayableOpen,
}: UpdateAccountPayableFormProps): JSX.Element => {
  const defaultState: UpdateAccountPayableFormState = {};
  const [state, dispatch] = useFormState<
    UpdateAccountPayableFormState,
    FormData
  >(handleUpdateAccountPayable, defaultState);

  const {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleBusinessBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
    accountPayableFormValues,
    handleFormValuesChange,
  } = useUpdateAccountPayableForm({
    state,
    handleCloseUpdateAccountPayable,
    accountPayableData,
    isUpdateAccountPayableOpen,
  });

  const updateAccountPayableForm = (accountPayableFormData: FormData) => {
    const updateAccountPayableData = {
      accountPayableId: accountPayableData.id,
      businessId: commandBusinessInputValue.businessId,
      branchId: commandBranchInputValue.branchId,
      serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
      registrationUserId: commandUserInputValue.userId,
    };

    appendDataToForm(accountPayableFormData, updateAccountPayableData);
    return dispatch(accountPayableFormData);
  };

  return (
    <Dialog
      open={isUpdateAccountPayableOpen}
      onOpenChange={() => {
        if (isUpdateAccountPayableOpen) {
          formRef.current?.reset();
        }
        handleCloseUpdateAccountPayable();
      }}
    >
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
                  : "Editar Conta a Pagar"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja atualizar a conta a pagar."
              : currentStep === "select-service-order"
                ? "Selecione opcionalmente uma ordem de serviço para associar à conta a pagar."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela conta a pagar."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização da conta a pagar."}
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
            errorBusinessId={state?.updateAccountPayableError?.businessId}
            errorBranchId={state?.updateAccountPayableError?.branchId}
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
              state?.updateAccountPayableError?.serviceOrderId
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
            errorUserId={state?.updateAccountPayableError?.registrationUserId}
          />
        ) : (
          <form ref={formRef} action={updateAccountPayableForm}>
            <UpdateAccountPayableFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              accountPayableData={accountPayableData}
              initialFormValues={accountPayableFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateAccountPayableForm };
