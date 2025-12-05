import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateAccountPayable } from "@/actions/update-account-payable";

import { cn } from "@/lib/utils";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useUpdateAccountPayableForm } from "./hooks";
import { DatePickerField } from "../../../custom";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchServiceOrder } from "../../../search-service-order";
import { SearchUser } from "../../../search-user";

import {
  UpdateAccountPayableFormState,
  SelectBusinessBranchStepProps,
  UpdateAccountPayableFormProps,
  SelectServiceOrderStepProps,
  SelectUserStepProps,
  UpdateAccountPayableContainerProps,
} from "./dto";
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
          errorBusinessId={state.updateAccountPayableError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.updateAccountPayableError?.branchId}
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
        <div>
          <SearchServiceOrder
            errorServiceOrderId={
              state.updateAccountPayableError?.serviceOrderId
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

      <SearchUser
        errorUserId={state.updateAccountPayableError?.registrationUserId}
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

// Step 4: Update Account Payable Form
const UpdateAccountPayableContainer = ({
  state,
  onBack,
  accountPayableData,
  isBusinessAndEntityDirty,
  isUpdateAccountPayableOpen,
}: UpdateAccountPayableContainerProps): JSX.Element => {
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
  const [state, dispatch] = useFormState(handleUpdateAccountPayable, null);

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
            <UpdateAccountPayableContainer
              state={state ?? defaultState}
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
