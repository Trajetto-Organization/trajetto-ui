import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import dynamic from "next/dynamic";

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
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateFine } from "@/actions/fine/update-fine";
import { useUpdateFineForm } from "./hooks";

import type {
  UpdateFineFormProps,
  UpdateFineFormSubmitProps,
  UpdateFineFormState,
} from "./update-fine-form.types";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { appendDataToForm } from "@/lib/append-data-form";

import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";

import { SelectViolationCodeStep } from "@/app/(protected)/_components/shared/steps/select-violation-code-step";
import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";

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

const UpdateFineFormSubmit = ({
  state,
  onBack,
  isEntityDirty,
  fineData,
  initialFormValues,
  onFormValuesChange,
  latitude,
  longitude,
  isLoadingLocation,
  handleLocationChange,
  handleLocationLoadingChange,
}: UpdateFineFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Helper to get initial date value
  const getInitialDateValue = (
    formKey: string,
    fineDataValue: string | Date | null | undefined,
  ): string => {
    if (initialFormValues[formKey] !== undefined) {
      return initialFormValues[formKey];
    }

    if (fineDataValue instanceof Date) {
      return fineDataValue.toISOString();
    }

    return fineDataValue || "";
  };

  // Form field states with lazy initializers
  const [violationDate, setViolationDate] = useState<string>(() =>
    getInitialDateValue("violation_date", fineData.violation_date),
  );

  const [dueDate, setDueDate] = useState<string>(() =>
    getInitialDateValue("due_date", fineData.due_date),
  );

  const [paymentDate, setPaymentDate] = useState<string>(() =>
    getInitialDateValue("payment_date", fineData.payment_date),
  );

  const [displayAmount, setDisplayAmount] = useState<string>(() => {
    if (initialFormValues.amount !== undefined) {
      return initialFormValues.amount;
    }

    if (fineData.amount) {
      const numericValue = formatCurrencyToNumber(fineData.amount);
      return formatToBrazilianCurrency(numericValue);
    }

    return "";
  });

  const [points, setPoints] = useState<string>(
    () => initialFormValues.points ?? fineData.points?.toString() ?? "",
  );

  const [location, setLocation] = useState<string>(
    () => initialFormValues.location ?? fineData.location ?? "",
  );

  const [observation, setObservation] = useState<string>(
    () => initialFormValues.observation ?? fineData.observation ?? "",
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

  // Dirty checking for form fields
  const getOriginalDateValue = (
    fineDataValue: string | Date | null | undefined,
  ): string => {
    if (fineDataValue instanceof Date) {
      return fineDataValue.toISOString();
    }

    return fineDataValue || "";
  };

  const originalAmountNumeric = fineData.amount
    ? formatCurrencyToNumber(fineData.amount)
    : 0;

  const isDirty = [
    violationDate !== getOriginalDateValue(fineData.violation_date),
    dueDate !== getOriginalDateValue(fineData.due_date),
    paymentDate !== getOriginalDateValue(fineData.payment_date),
    formatCurrencyToNumber(displayAmount) !== originalAmountNumeric,
    points !== (fineData.points?.toString() || ""),
    location !== (fineData.location || ""),
    observation !== (fineData.observation || ""),
    latitude !== (fineData.latitude ?? null),
    longitude !== (fineData.longitude ?? null),
  ].some(Boolean);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <DatePickerField
          label="Data da infração *"
          htmlfor="violation_date"
          name="violation_date"
          value={violationDate}
          onChange={handleViolationDateChange}
          errorName={state.updateFineError?.violation_date}
          disabled={pending}
        />

        <DatePickerField
          label="Data de vencimento *"
          htmlfor="due_date"
          name="due_date"
          value={dueDate}
          onChange={handleDueDateChange}
          errorName={state.updateFineError?.due_date}
          disabled={pending}
          allowFutureDates={true}
        />

        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={paymentDate}
          onChange={handlePaymentDateChange}
          errorName={state.updateFineError?.payment_date}
          disabled={pending}
        />

        <FormInput
          label="Valor da multa *"
          htmlfor="amount"
          name="amount"
          type="text"
          errorName={state.updateFineError?.amount}
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
          errorName={state.updateFineError?.points}
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
          errorName={state.updateFineError?.location}
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
            errorName={state.updateFineError?.observation}
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
              state.updateFineError?.latitude?.[0] ||
              state.updateFineError?.longitude?.[0]
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
        <Button
          type="submit"
          disabled={pending || !(isDirty || isEntityDirty) || isLoadingLocation}
        >
          <span>Editar Multa</span>
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

const UpdateFineForm = ({
  fineData,
  handleCloseUpdateFine,
  isUpdateFineOpen,
}: UpdateFineFormProps): JSX.Element => {
  const defaultState: UpdateFineFormState = {};
  const [state, dispatch] = useFormState<UpdateFineFormState, FormData>(
    handleUpdateFine,
    defaultState,
  );

  // 📍 GEOLOCATION STATE - Initialize with fineData values
  const [latitude, setLatitude] = useState<number | null>(
    fineData.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    fineData.longitude ?? null,
  );

  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const handleLocationChange = (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleLocationLoadingChange = (isLoading: boolean) => {
    setIsLoadingLocation(isLoading);
  };

  // Reset geolocation states when modal closes
  useEffect(() => {
    if (isUpdateFineOpen) {
      setLatitude(fineData.latitude ?? null);
      setLongitude(fineData.longitude ?? null);

      setIsLoadingLocation(false);
    }
  }, [isUpdateFineOpen, fineData.latitude, fineData.longitude]);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandTrafficViolationCodeInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleViolationCodeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToViolationCodeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchTrafficViolationCodeInputValue,
    isEntityDirty,
    fineFormValues,
    handleFormValuesChange,
  } = useUpdateFineForm({
    state,
    fineData,
    handleCloseUpdateFine,
    isUpdateFineOpen,
  });

  const updateFineForm = (fineFormData: FormData) => {
    const updateFineData = {
      fineId: fineData.id,
      businessId: fineData.businessId,
      branchId: commandBranchInputValue.branchId,
      driverId: commandDriverInputValue.driverId,
      vehicleId: commandVehicleInputValue.vehicleId,
      trafficViolationCodeId:
        commandTrafficViolationCodeInputValue.trafficViolationCodeId,
    };

    // 📍 GEOLOCATION: Handle latitude/longitude separately to support null values
    // When null, send as empty string (backend will convert to null)
    if (latitude === null) {
      fineFormData.append("latitude", "");
    } else if (latitude !== undefined) {
      fineFormData.append("latitude", latitude.toString());
    }

    if (longitude === null) {
      fineFormData.append("longitude", "");
    } else if (longitude !== undefined) {
      fineFormData.append("longitude", longitude.toString());
    }

    appendDataToForm(fineFormData, updateFineData);
    return dispatch(fineFormData);
  };

  return (
    <Dialog open={isUpdateFineOpen} onOpenChange={handleCloseUpdateFine}>
      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-violation-code"
                  ? "Selecionar Código de Infração"
                  : "Editar Multa"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para qual deseja atualizar a multa."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista (se necessário alterar)."
                : currentStep === "select-violation-code"
                  ? "Selecione o código de infração (se necessário alterar)."
                  : "Atualize as informações da multa conforme necessário."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateFineError?.branchId}
            businessId={fineData.businessId}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={fineData.businessId}
            commandVehicleInputValue={commandVehicleInputValue}
            commandDriverInputValue={commandDriverInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            onContinue={handleVehicleDriverStepContinue}
            onBack={handleBackToBranchStep}
            errorDriverId={state.updateFineError?.driverId}
            errorVehicleId={state.updateFineError?.vehicleId}
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
              state.updateFineError?.trafficViolationCodeId
            }
          />
        ) : (
          <form ref={formRef} action={updateFineForm}>
            <UpdateFineFormSubmit
              state={state}
              onBack={handleBackToViolationCodeStep}
              isEntityDirty={isEntityDirty}
              fineData={fineData}
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

export { UpdateFineForm };
