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

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateFine } from "@/actions/create-fine";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { DatePickerField } from "../../../custom";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchDriver } from "../../../search-driver";

import { SearchTrafficViolationCode } from "../../../search-traffic-violation-code";
import { useCreateFineForm } from "./hooks";

import { cn } from "@/lib/utils";

import {
  CreateFineFormState,
  CreateFineContainerProps,
  SelectBusinessBranchStepProps,
  SelectVehicleDriverStepProps,
  SelectViolationCodeStepProps,
} from "./dto";

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
        <div>
          <SearchBusiness
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            searchBusinessInputValue={searchBusinessInputValue}
            errorBusinessId={state.createFineError?.businessId}
          />
        </div>

        {searchBusinessInputValue && (
          <div>
            <SearchBranch
              errorBranchId={state.createFineError?.branchId}
              searchBranchInputValue={searchBranchInputValue}
              businessId={businessId}
              handleUpdateSearchBranchInputValue={
                handleUpdateSearchBranchInputValue
              }
            />
          </div>
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

// Step 2: Select Vehicle and Driver
const SelectVehicleDriverStep = ({
  state,
  businessId,
  commandVehicleInputValue,
  commandDriverInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchDriverInputValue,
  onContinue,
  onBack,
}: SelectVehicleDriverStepProps) => {
  return (
    <div className="space-y-6">
      {(commandVehicleInputValue.searchVehicleInputValue ||
        commandDriverInputValue.searchDriverInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {commandVehicleInputValue.searchVehicleInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Veículo:</span>
                <span className="w-full truncate">
                  {commandVehicleInputValue.searchVehicleInputValue}{" "}
                  {commandVehicleInputValue.vehicleLicensePlate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Placa: {commandVehicleInputValue.vehicleLicensePlate})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchVehicleInputValue({
                    vehicleId: "",
                    searchVehicleInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {commandDriverInputValue.searchDriverInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Motorista:</span>
                <span className="w-full truncate">
                  {commandDriverInputValue.searchDriverInputValue}{" "}
                  {commandDriverInputValue.driverCnh && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (CNH: {commandDriverInputValue.driverCnh})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchDriverInputValue({
                    driverId: "",
                    searchDriverInputValue: "",
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
        <div>
          <SearchVehicle
            errorVehicleId={state.createFineError?.vehicleId}
            selectedVehicleId={commandVehicleInputValue.vehicleId}
            businessId={businessId}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
          />
        </div>

        <div>
          <SearchDriver
            errorDriverId={state.createFineError?.driverId}
            selectedDriverId={commandDriverInputValue.driverId}
            businessId={businessId}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
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
            !commandVehicleInputValue.vehicleId ||
            !commandDriverInputValue.driverId
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 3: Select Traffic Violation Code
const SelectViolationCodeStep = ({
  state,
  commandTrafficViolationCodeInputValue,
  handleUpdateSearchTrafficViolationCodeInputValue,
  onContinue,
  onBack,
}: SelectViolationCodeStepProps) => {
  return (
    <div className="space-y-6">
      {commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue && (
        <div className="grid grid-cols-1 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Código de Infração:</span>
              <span className="w-full truncate">
                <span className="text-xs text-muted-foreground ml-1">
                  {
                    commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue
                  }
                </span>
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchTrafficViolationCodeInputValue({
                  trafficViolationCodeId: "",
                  searchTrafficViolationCodeInputValue: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <SearchTrafficViolationCode
        errorTrafficViolationCodeId={
          state.createFineError?.trafficViolationCodeId
        }
        searchTrafficViolationCodeInputValue={
          commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue
        }
        handleUpdateSearchTrafficViolationCodeInputValue={
          handleUpdateSearchTrafficViolationCodeInputValue
        }
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            !commandTrafficViolationCodeInputValue.trafficViolationCodeId
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 4: Create Fine Form
const CreateFineContainer = ({
  state,
  onBack,
}: CreateFineContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const [displayAmount, setDisplayAmount] = useState<string>("");

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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <DatePickerField
          label="Data da infração"
          htmlfor="violation_date"
          name="violation_date"
          value={formValues.violation_date || ""}
          onChange={handleCustomFieldChange("violation_date")}
          errorName={state.createFineError?.violation_date}
          disabled={pending}
        />

        <DatePickerField
          label="Data de vencimento"
          htmlfor="due_date"
          name="due_date"
          value={formValues.due_date || ""}
          onChange={handleCustomFieldChange("due_date")}
          errorName={state.createFineError?.due_date}
          disabled={pending}
          allowFutureDates={true}
        />

        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={formValues.payment_date || ""}
          onChange={handleCustomFieldChange("payment_date")}
          errorName={state.createFineError?.payment_date}
          disabled={pending}
        />

        <FormInput
          label="Valor da multa"
          htmlfor="amount"
          name="amount"
          type="text"
          errorName={state.createFineError?.amount}
          value={displayAmount}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          placeholder="0,00"
          disabled={pending}
        />

        <FormInput
          label="Pontos na carteira"
          htmlfor="points"
          name="points"
          type="number"
          min="0"
          max="20"
          errorName={state.createFineError?.points}
          placeholder="Digite a pontuação"
          disabled={pending}
        />

        <FormInput
          label="Local da infração (opcional)"
          htmlfor="location"
          name="location"
          type="text"
          errorName={state.createFineError?.location}
          placeholder="Digite o local da infração"
          disabled={pending}
        />

        <div className="col-span-2">
          <FormInput
            label="Observações (opcional)"
            htmlfor="observation"
            name="observation"
            type="text"
            errorName={state.createFineError?.observation}
            placeholder="Digite observações sobre a multa"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" disabled={pending}>
          <span>Criar Multa</span>
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

const CreateFineForm = (): JSX.Element => {
  const defaultState: CreateFineFormState = {};
  const [state, dispatch] = useFormState(handleCreateFine, null);

  const {
    isCreateFineForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandTrafficViolationCodeInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchTrafficViolationCodeInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleViolationCodeStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToViolationCodeStep,
  } = useCreateFineForm(state);

  return (
    <Dialog open={isCreateFineForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          Criar Multa
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-violation-code"
                  ? "Selecionar Código de Infração"
                  : "Criar Nova Multa"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja criar uma multa."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e o motorista envolvidos na infração."
                : currentStep === "select-violation-code"
                  ? "Selecione o código de infração de trânsito correspondente."
                  : "Insira as informações da multa para concluir o cadastro."}
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
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandVehicleInputValue={commandVehicleInputValue}
            commandDriverInputValue={commandDriverInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            onContinue={handleVehicleDriverStepContinue}
            onBack={handleBackToBusinessBranchStep}
          />
        ) : currentStep === "select-violation-code" ? (
          <SelectViolationCodeStep
            state={state ?? defaultState}
            commandTrafficViolationCodeInputValue={
              commandTrafficViolationCodeInputValue
            }
            handleUpdateSearchTrafficViolationCodeInputValue={
              handleUpdateSearchTrafficViolationCodeInputValue
            }
            onContinue={handleViolationCodeStepContinue}
            onBack={handleBackToVehicleDriverStep}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              formData.append(
                "businessId",
                commandBusinessInputValue.businessId,
              );

              formData.append("branchId", commandBranchInputValue.branchId);
              formData.append("vehicleId", commandVehicleInputValue.vehicleId);

              formData.append("driverId", commandDriverInputValue.driverId);
              formData.append(
                "trafficViolationCodeId",
                commandTrafficViolationCodeInputValue.trafficViolationCodeId,
              );

              dispatch(formData);
            }}
          >
            <CreateFineContainer
              state={state ?? defaultState}
              onBack={handleBackToViolationCodeStep}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateFineForm };
