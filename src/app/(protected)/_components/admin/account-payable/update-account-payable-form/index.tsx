import { useState, useEffect } from "react";
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
import FormInput from "@/components/custom/form-input";

import { DatePickerField } from "../../../custom";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { handleUpdateAccountPayable } from "@/actions/update-account-payable";
import { useUpdateAccountPayableForm } from "./hooks";

import { SelectUserStep } from "@/app/(protected)/_components/steps/select-user-step";
import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";

import { SelectServiceOrderStep } from "@/app/(protected)/_components/steps/select-service-order-step";

import {
  UpdateAccountPayableFormState,
  UpdateAccountPayableFormProps,
  UpdateAccountPayableFormSubmitProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

const UpdateAccountPayableFormSubmit = ({
  state,
  onBack,
  accountPayableData,
  isBusinessAndEntityDirty,
  isUpdateAccountPayableOpen,
}: UpdateAccountPayableFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [displayAmount, setDisplayAmount] = useState<string>("");
  const [displayAmountPaid, setDisplayAmountPaid] = useState<string>("");

  // Initialize form values when the component mounts
  useEffect(() => {
    if (accountPayableData && isUpdateAccountPayableOpen) {
      setFormValues({
        due_date: accountPayableData.due_date,
        payment_date:
          accountPayableData.payment_date &&
          accountPayableData.payment_date !== "N/A"
            ? accountPayableData.payment_date
            : "",
      });

      setDisplayAmount(accountPayableData.amount);
      setDisplayAmountPaid(accountPayableData.amount_paid || "");
    }
  }, [accountPayableData, isUpdateAccountPayableOpen]);

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [fieldName]: value };

      // Check if any field has changed
      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue =
          accountPayableData[key as keyof typeof accountPayableData];

        if (key === "payment_date" && !originalValue && !val) {
          return false;
        }

        return originalValue !== val;
      });

      const isAmountChanged = displayAmount !== accountPayableData.amount;
      const isAmountPaidChanged =
        displayAmountPaid !== (accountPayableData.amount_paid || "");

      setIsDirty(isAnyFieldChanged || isAmountChanged || isAmountPaidChanged);
      return newValues;
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayAmount(inputValue);

    const isAmountPaidChanged =
      displayAmountPaid !== (accountPayableData.amount_paid || "");
    setIsDirty(inputValue !== accountPayableData.amount || isAmountPaidChanged);
  };

  const handleAmountBlur = (): void => {
    if (!displayAmount || displayAmount === "," || displayAmount === ".") {
      setDisplayAmount("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayAmount);
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayAmount(formattedValue);

    const isAmountPaidChanged =
      displayAmountPaid !== (accountPayableData.amount_paid || "");
    setIsDirty(
      formattedValue !== accountPayableData.amount || isAmountPaidChanged,
    );
  };

  const handleAmountPaidChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayAmountPaid(inputValue);

    const isAmountChanged = displayAmount !== accountPayableData.amount;
    setIsDirty(
      inputValue !== (accountPayableData.amount_paid || "") || isAmountChanged,
    );
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
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayAmountPaid(formattedValue);

    const isAmountChanged = displayAmount !== accountPayableData.amount;
    setIsDirty(
      formattedValue !== (accountPayableData.amount_paid || "") ||
        isAmountChanged,
    );
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
          errorName={state.updateAccountPayableError?.due_date}
          disabled={pending}
        />

        {/* Payment Date - Optional */}
        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={formValues.payment_date || ""}
          onChange={handleCustomFieldChange("payment_date")}
          errorName={state.updateAccountPayableError?.payment_date}
          disabled={pending}
        />

        {/* Amount */}
        <FormInput
          label="Valor total"
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
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || (!isDirty && !isBusinessAndEntityDirty)}
        >
          <span>Atualizar Conta a Pagar</span>
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
  } = useUpdateAccountPayableForm({
    state,
    handleCloseUpdateAccountPayable,
    accountPayableData,
    isUpdateAccountPayableOpen,
  });

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
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-service-order"
                ? "Selecionar Ordem de Serviço (Opcional)"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Atualizar Conta a Pagar"}
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
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                accountPayableId: accountPayableData.id,
                businessId: commandBusinessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
                registrationUserId: commandUserInputValue.userId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateAccountPayableFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              accountPayableData={accountPayableData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateAccountPayableOpen={isUpdateAccountPayableOpen}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateAccountPayableForm };
