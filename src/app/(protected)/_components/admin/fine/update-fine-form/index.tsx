import { useState, useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import dynamic from "next/dynamic";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateFine } from "@/actions/update-fine";
import { useUpdateFineForm } from "./hooks";

import {
  UpdateFineFormProps,
  UpdateFineFormSubmitProps,
  UpdateFineFormState,
} from "./dto";

import { DatePickerField } from "../../../custom";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { FineProps } from "../dto";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/steps/select-vehicle-driver-step";

import { SelectViolationCodeStep } from "@/app/(protected)/_components/steps/select-violation-code-step";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/custom/location-picker"),
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
  fineData,
  isBusinessAndEntityDirty,
  isUpdateFineOpen,
  latitude,
  longitude,
  isLoadingLocation,
  handleLocationChange,
  handleLocationLoadingChange,
}: UpdateFineFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [fieldName]: value };

      const hasChanges = Object.keys(newValues).some((key) => {
        const originalValue = fineData[key as keyof FineProps];
        return newValues[key] !== (originalValue?.toString() || "");
      });

      setIsDirty(hasChanges);
      return newValues;
    });
  };

  const [displayAmount, setDisplayAmount] = useState<string>("");

  useEffect(() => {
    if (isUpdateFineOpen && fineData.amount) {
      setDisplayAmount(fineData.amount);
    }
  }, [isUpdateFineOpen, fineData.amount]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [fieldName]: value };

      // Check if any field has changed
      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue = fineData[key as keyof FineProps];

        if (typeof originalValue === "number") {
          return originalValue.toString() !== val;
        }

        return originalValue !== val;
      });

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayAmount(inputValue);
    handleFieldChange("amount", inputValue);
  };

  const handleAmountBlur = (): void => {
    if (!displayAmount || displayAmount === "," || displayAmount === ".") {
      setDisplayAmount("");
      handleFieldChange("amount", "");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayAmount);
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayAmount(formattedValue);
    handleFieldChange("amount", formattedValue);
  };

  // Initialize form values with existing data
  useEffect(() => {
    if (isUpdateFineOpen && fineData) {
      const initialValues: Record<string, string> = {};

      if (fineData.violation_date) {
        initialValues.violation_date = fineData.violation_date;
      }

      if (fineData.due_date) {
        initialValues.due_date = fineData.due_date;
      }

      if (fineData.payment_date) {
        initialValues.payment_date = fineData.payment_date;
      }

      setFormValues(initialValues);
    }
  }, [isUpdateFineOpen, fineData]);

  // 📍 Check if location has changed
  const [hasLocationChanged, setHasLocationChanged] = useState<boolean>(false);

  useEffect(() => {
    const originalLat = fineData.latitude ?? null;
    const originalLng = fineData.longitude ?? null;

    // Check if location changed (compare with original fineData values)
    const latChanged = originalLat !== latitude;
    const lngChanged = originalLng !== longitude;

    setHasLocationChanged(latChanged || lngChanged);
  }, [latitude, longitude, fineData.latitude, fineData.longitude]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <DatePickerField
          label="Data da infração"
          htmlfor="violation_date"
          name="violation_date"
          value={formValues.violation_date || fineData.violation_date || ""}
          onChange={handleCustomFieldChange("violation_date")}
          errorName={state.updateFineError?.violation_date}
          disabled={pending}
        />

        <DatePickerField
          label="Data de vencimento"
          htmlfor="due_date"
          name="due_date"
          value={formValues.due_date || fineData.due_date || ""}
          onChange={handleCustomFieldChange("due_date")}
          errorName={state.updateFineError?.due_date}
          disabled={pending}
          allowFutureDates={true}
        />

        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={formValues.payment_date || fineData.payment_date || ""}
          onChange={handleCustomFieldChange("payment_date")}
          errorName={state.updateFineError?.payment_date}
          disabled={pending}
        />

        <FormInput
          label="Valor da multa"
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
          label="Pontos na carteira"
          htmlfor="points"
          name="points"
          type="number"
          min="0"
          max="20"
          defaultValue={fineData.points?.toString() || ""}
          errorName={state.updateFineError?.points}
          placeholder="Digite a pontuação"
          disabled={pending}
          onChange={(e) => {
            const originalValue = fineData.points?.toString() || "";
            setIsDirty(e.target.value !== originalValue);
          }}
        />

        <FormInput
          label="Local da infração (opcional)"
          htmlfor="location"
          name="location"
          type="text"
          defaultValue={fineData.location || ""}
          errorName={state.updateFineError?.location}
          placeholder="Digite o local da infração"
          disabled={pending}
          onChange={(e) => {
            const originalValue = fineData.location || "";
            setIsDirty(e.target.value !== originalValue);
          }}
        />

        <div className="col-span-1 md:col-span-2">
          <FormInput
            label="Observações (opcional)"
            htmlfor="observation"
            name="observation"
            type="text"
            defaultValue={fineData.observation || ""}
            errorName={state.updateFineError?.observation}
            placeholder="Digite observações sobre a multa"
            disabled={pending}
            onChange={(e) => {
              const originalValue = fineData.observation || "";
              setIsDirty(e.target.value !== originalValue);
            }}
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
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            !(isDirty || isBusinessAndEntityDirty || hasLocationChanged) ||
            isLoadingLocation
          }
        >
          <span>Atualizar Multa</span>
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

  // 📍 GEOLOCATION STATE - Initialize with existing fineData location
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

  // Reset location state when fineData changes
  useEffect(() => {
    if (isUpdateFineOpen) {
      setLatitude(fineData.latitude ?? null);
      setLongitude(fineData.longitude ?? null);

      setIsLoadingLocation(false);
    }
  }, [fineData, isUpdateFineOpen]);

  const {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandTrafficViolationCodeInputValue,
    handleBusinessStepContinue,
    handleVehicleDriverStepContinue,
    handleViolationCodeStepContinue,
    handleBackToBusinessStep,
    handleBackToVehicleDriverStep,
    handleBackToViolationCodeStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchTrafficViolationCodeInputValue,
    isBusinessAndEntityDirty,
  } = useUpdateFineForm({
    state,
    fineData,
    handleCloseUpdateFine,
    isUpdateFineOpen,
  });

  return (
    <Dialog open={isUpdateFineOpen} onOpenChange={handleCloseUpdateFine}>
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-violation-code"
                  ? "Selecionar Código de Infração"
                  : "Editar Multa"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa e filial (se necessário alterar)."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista (se necessário alterar)."
                : currentStep === "select-violation-code"
                  ? "Selecione o código de infração (se necessário alterar)."
                  : "Atualize as informações da multa conforme necessário."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessBranchStep
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBusinessId={state.updateFineError?.businessId}
            errorBranchId={state.updateFineError?.branchId}
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
            onBack={handleBackToBusinessStep}
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
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                fineId: fineData.id,
                branchId: commandBranchInputValue.branchId,
                driverId: commandDriverInputValue.driverId,
                vehicleId: commandVehicleInputValue.vehicleId,
                trafficViolationCodeId:
                  commandTrafficViolationCodeInputValue.trafficViolationCodeId,
              };

              // 📍 GEOLOCATION: Handle latitude/longitude separately to support null values
              // When null, send as empty string (backend will convert to null)
              if (latitude === null) {
                formData.append("latitude", "");
              } else if (latitude !== undefined) {
                formData.append("latitude", latitude.toString());
              }

              if (longitude === null) {
                formData.append("longitude", "");
              } else if (longitude !== undefined) {
                formData.append("longitude", longitude.toString());
              }

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateFineFormSubmit
              state={state}
              onBack={handleBackToViolationCodeStep}
              fineData={fineData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateFineOpen={isUpdateFineOpen}
              commandBusinessInputValue={commandBusinessInputValue}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateFineForm };
