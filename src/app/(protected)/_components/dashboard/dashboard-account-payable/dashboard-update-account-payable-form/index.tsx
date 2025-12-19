import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateAccountPayable } from "@/actions/update-account-payable";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useDashboardUpdateAccountPayableForm } from "./hooks";
import { DatePickerField } from "../../../custom";

import {
  DashboardUpdateAccountPayableFormState,
  DashboardUpdateAccountPayableFormProps,
  DashboardUpdateAccountPayableFormSubmitProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { useAuthStore } from "@/store/auth-store";

import { SelectUserStep } from "@/app/(protected)/_components/steps/select-user-step";
import { SelectBranchStep } from "@/app/(protected)/_components/steps/select-branch-step";

import { SelectServiceOrderStep } from "@/app/(protected)/_components/steps/select-service-order-step";

const DashboardUpdateAccountPayableFormSubmit = ({
  state,
  onBack,
  accountPayableData,
  isBusinessAndEntityDirty,
  isUpdateAccountPayableOpen,
}: DashboardUpdateAccountPayableFormSubmitProps): JSX.Element => {
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

const DashboardUpdateAccountPayableForm = ({
  accountPayableData,
  handleCloseUpdateAccountPayable,
  isUpdateAccountPayableOpen,
}: DashboardUpdateAccountPayableFormProps): JSX.Element => {
  const defaultState: DashboardUpdateAccountPayableFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateAccountPayableFormState,
    FormData
  >(handleUpdateAccountPayable, defaultState);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleBusinessBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
  } = useDashboardUpdateAccountPayableForm({
    state,
    handleCloseUpdateAccountPayable,
    accountPayableData,
    isUpdateAccountPayableOpen,
  });

  const { businessId } = useAuthStore();

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
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-service-order"
                ? "Selecionar Ordem de Serviço (Opcional)"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Atualizar Conta a Pagar"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja atualizar a conta a pagar."
              : currentStep === "select-service-order"
                ? "Selecione opcionalmente uma ordem de serviço para associar à conta a pagar."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela conta a pagar."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização da conta a pagar."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            businessId={businessId as string}
            errorBranchId={state.updateAccountPayableError?.branchId}
          />
        ) : currentStep === "select-service-order" ? (
          <SelectServiceOrderStep
            businessId={businessId as string}
            commandServiceOrderInputValue={commandServiceOrderInputValue}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            onContinue={handleServiceOrderStepContinue}
            onBack={handleBackToBranchStep}
            errorServiceOrderId={
              state.updateAccountPayableError?.serviceOrderId
            }
            searchServiceOrderIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={businessId as string}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToServiceOrderStep}
            errorUserId={state.updateAccountPayableError?.registrationUserId}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                accountPayableId: accountPayableData.id,
                businessId: businessId as string,
                branchId: commandBranchInputValue.branchId,
                serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
                registrationUserId: commandUserInputValue.userId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <DashboardUpdateAccountPayableFormSubmit
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

export { DashboardUpdateAccountPayableForm };
