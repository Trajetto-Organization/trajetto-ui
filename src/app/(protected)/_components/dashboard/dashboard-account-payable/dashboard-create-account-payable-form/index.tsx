import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type {
  DashboardCreateAccountPayableFormSubmitProps,
  DashboardCreateAccountPayableFormState,
} from "./dashboard-create-account-payable-form.types";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { handleCreateAccountPayable } from "@/actions/account-payable/create-account-payable";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { useDashboardCreateAccountPayableForm } from "./hooks";
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

import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";
import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";

import { SelectServiceOrderStep } from "@/app/(protected)/_components/shared/steps/select-service-order-step";

const DashboardCreateAccountPayableFormSubmit = ({
  state,
  onBack,
  initialFormValues,
  onFormValuesChange,
}: DashboardCreateAccountPayableFormSubmitProps): JSX.Element => {
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

const DashboardCreateAccountPayableForm = (): JSX.Element => {
  const defaultState: DashboardCreateAccountPayableFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateAccountPayableFormState,
    FormData
  >(handleCreateAccountPayable, defaultState);

  const {
    isCreateAccountPayableForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandServiceOrderInputValue,
    commandUserInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchServiceOrderInputValue,
    handleUpdateSearchUserInputValue,
    handleBranchStepContinue,
    handleServiceOrderStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToServiceOrderStep,
    handleBackToUserStep,
    accountPayableFormValues,
    handleFormValuesChange,
  } = useDashboardCreateAccountPayableForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.ACCOUNT_PAYABLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.ACCOUNT_PAYABLE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const createAccountPayableForm = (accountPayableFormData: FormData) => {
    const accountPayableData = {
      businessId: businessId as string,
      branchId: commandBranchInputValue.branchId,
      serviceOrderId: commandServiceOrderInputValue.serviceOrderId,
      registrationUserId: commandUserInputValue.userId,
    };

    appendDataToForm(accountPayableFormData, accountPayableData);
    return dispatch(accountPayableFormData);
  };

  return (
    <Dialog open={isCreateAccountPayableForm} onOpenChange={handleCloseDialog}>
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
                  Criar Conta a Pagar
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
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-service-order"
                ? "Selecionar Ordem de Serviço (Opcional)"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Criar Nova Conta a Pagar"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja criar uma conta a pagar."
              : currentStep === "select-service-order"
                ? "Selecione opcionalmente uma ordem de serviço para associar à conta a pagar."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela conta a pagar."
                  : "Insira as informações solicitadas abaixo para concluir a criação da conta a pagar."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            businessId={businessId as string}
            errorBranchId={state.createAccountPayableError?.branchId}
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
              state.createAccountPayableError?.serviceOrderId
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
            errorUserId={state.createAccountPayableError?.registrationUserId}
          />
        ) : (
          <form ref={formRef} action={createAccountPayableForm}>
            <DashboardCreateAccountPayableFormSubmit
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

export { DashboardCreateAccountPayableForm };
