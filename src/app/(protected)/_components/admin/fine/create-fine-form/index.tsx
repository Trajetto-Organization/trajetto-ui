import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import dynamic from "next/dynamic";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { handleCreateFine } from "@/actions/fine/create-fine";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { useCreateFineForm } from "./hooks";

import type {
  CreateFineFormState,
  CreateFineFormSubmitProps,
} from "./create-fine-form.types";
import { appendDataToForm } from "@/lib/append-data-form";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/shared/steps/select-business-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";

import { SelectViolationCodeStep } from "@/app/(protected)/_components/shared/steps/select-violation-code-step";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/shared/custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        Carregando mapa...
      </div>
    ),
  },
);

const CreateFineFormSubmit = ({
  state,
  onBack,
  initialFormValues,
  onFormValuesChange,
  latitude,
  longitude,
  isLoadingLocation,
  handleLocationChange,
  handleLocationLoadingChange,
}: CreateFineFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Form field states with lazy initializers
  const [violationDate, setViolationDate] = useState<string>(
    () => initialFormValues.violation_date || "",
  );

  const [dueDate, setDueDate] = useState<string>(
    () => initialFormValues.due_date || "",
  );

  const [paymentDate, setPaymentDate] = useState<string>(
    () => initialFormValues.payment_date || "",
  );

  const [displayAmount, setDisplayAmount] = useState<string>(
    () => initialFormValues.amount || "",
  );

  const [points, setPoints] = useState<string>(
    () => initialFormValues.points || "",
  );

  const [location, setLocation] = useState<string>(
    () => initialFormValues.location || "",
  );

  const [observation, setObservation] = useState<string>(
    () => initialFormValues.observation || "",
  );

  // Date handlers
  const handleViolationDateChange = (value: string): void => {
    setViolationDate(value);
  };

  const handleDueDateChange = (value: string): void => {
    setDueDate(value);
  };

  const handlePaymentDateChange = (value: string): void => {
    setPaymentDate(value);
  };

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

  // Other field handlers
  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPoints(e.target.value);
  };

  const handleLocationInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setLocation(e.target.value);
  };

  const handleObservationChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setObservation(e.target.value);
  };

  // Function to save form values and go back
  const handleBack = () => {
    const allFormValues: Record<string, string> = {
      violation_date: violationDate,
      due_date: dueDate,
      payment_date: paymentDate,
      amount: displayAmount,
      points: points,
      location: location,
      observation: observation,
    };

    onFormValuesChange(allFormValues);
    onBack();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <DatePickerField
          label="Data da infração *"
          htmlfor="violation_date"
          name="violation_date"
          value={violationDate}
          onChange={handleViolationDateChange}
          errorName={state.createFineError?.violation_date}
          disabled={pending}
        />

        <DatePickerField
          label="Data de vencimento *"
          htmlfor="due_date"
          name="due_date"
          value={dueDate}
          onChange={handleDueDateChange}
          errorName={state.createFineError?.due_date}
          disabled={pending}
          allowFutureDates={true}
        />

        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={paymentDate}
          onChange={handlePaymentDateChange}
          errorName={state.createFineError?.payment_date}
          disabled={pending}
        />

        <FormInput
          label="Valor da multa *"
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
          label="Pontos na carteira *"
          htmlfor="points"
          name="points"
          type="number"
          min="0"
          max="20"
          value={points}
          onChange={handlePointsChange}
          errorName={state.createFineError?.points}
          placeholder="Digite a pontuação"
          disabled={pending}
        />

        <FormInput
          label="Local da infração (opcional)"
          htmlfor="location"
          name="location"
          type="text"
          value={location}
          onChange={handleLocationInputChange}
          errorName={state.createFineError?.location}
          placeholder="Digite o local da infração"
          disabled={pending}
        />

        <div className="col-span-1 md:col-span-2">
          <FormInput
            label="Observações (opcional)"
            htmlfor="observation"
            name="observation"
            type="text"
            value={observation}
            onChange={handleObservationChange}
            errorName={state.createFineError?.observation}
            placeholder="Digite observações sobre a multa"
            disabled={pending}
          />
        </div>

        {/* 📍 GEOLOCATION: Location Picker */}
        <div className="col-span-1 md:col-span-2">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            onLoadingChange={handleLocationLoadingChange}
            disabled={pending}
            error={
              state.createFineError?.latitude?.[0] ||
              state.createFineError?.longitude?.[0]
            }
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || isLoadingLocation}
        >
          Voltar
        </Button>
        <Button type="submit" disabled={pending || isLoadingLocation}>
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
  const [state, dispatch] = useFormState<CreateFineFormState, FormData>(
    handleCreateFine,
    defaultState,
  );

  // 📍 GEOLOCATION STATE
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const handleLocationChange = (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleLocationLoadingChange = (isLoading: boolean) => {
    setIsLoadingLocation(isLoading);
  };

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
    fineFormValues,
    handleFormValuesChange,
  } = useCreateFineForm(state);

  // Reset geolocation states when modal closes
  useEffect(() => {
    if (!isCreateFineForm) {
      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [isCreateFineForm]);

  // Reset geolocation states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [state?.successMessage]);

  const createFineForm = (fineFormData: FormData) => {
    const fineData = {
      businessId: commandBusinessInputValue.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
      trafficViolationCodeId:
        commandTrafficViolationCodeInputValue.trafficViolationCodeId,
      latitude: latitude?.toString() as string,
      longitude: longitude?.toString() as string,
    };

    appendDataToForm(fineFormData, fineData);
    return dispatch(fineFormData);
  };

  return (
    <Dialog open={isCreateFineForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Multa
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
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.createFineError?.branchId}
            errorBusinessId={state.createFineError?.businessId}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
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
            errorDriverId={state.createFineError?.driverId}
            errorVehicleId={state.createFineError?.vehicleId}
          />
        ) : currentStep === "select-violation-code" ? (
          <SelectViolationCodeStep
            commandTrafficViolationCodeInputValue={
              commandTrafficViolationCodeInputValue
            }
            handleUpdateSearchTrafficViolationCodeInputValue={
              handleUpdateSearchTrafficViolationCodeInputValue
            }
            onContinue={handleViolationCodeStepContinue}
            onBack={handleBackToVehicleDriverStep}
            errorTrafficViolationCodeId={
              state.createFineError?.trafficViolationCodeId
            }
          />
        ) : (
          <form ref={formRef} action={createFineForm}>
            <CreateFineFormSubmit
              state={state}
              onBack={handleBackToViolationCodeStep}
              initialFormValues={fineFormValues}
              onFormValuesChange={handleFormValuesChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateFineForm };
