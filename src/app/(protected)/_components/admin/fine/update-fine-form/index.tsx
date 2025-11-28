import { useState, useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import dynamic from "next/dynamic";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateFine } from "@/actions/update-fine";
import { cn } from "@/lib/utils";

import { useUpdateFineForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchDriver } from "../../../search-driver";

import { SearchTrafficViolationCode } from "../../../search-traffic-violation-code";

import {
  UpdateFineFormProps,
  UpdateFineContainerProps,
  UpdateFineFormState,
  SelectBusinessByStepProps,
  SelectVehicleDriverStepProps,
  SelectViolationCodeStepProps,
} from "./dto";

import { DatePickerField } from "../../../custom";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { FineProps } from "../dto";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("../../../custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        Carregando mapa...
      </div>
    ),
  },
);

// Step 1: Select Business and Branch
const SelectBusinessStep = ({
  state,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: SelectBusinessByStepProps) => {
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
            errorBusinessId={state.updateFineError?.businessId}
          />
        </div>

        {searchBusinessInputValue && (
          <div>
            <SearchBranch
              errorBranchId={state.updateFineError?.branchId}
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
                    vehicleLicensePlate: "",
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
                    driverCnh: "",
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
        <SearchVehicle
          errorVehicleId={state.updateFineError?.vehicleId}
          selectedVehicleId={commandVehicleInputValue.vehicleId}
          businessId={businessId}
          handleUpdateSearchVehicleInputValue={
            handleUpdateSearchVehicleInputValue
          }
        />

        <SearchDriver
          errorDriverId={state.updateFineError?.driverId}
          selectedDriverId={commandDriverInputValue.driverId}
          businessId={businessId}
          handleUpdateSearchDriverInputValue={
            handleUpdateSearchDriverInputValue
          }
        />
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
          <div className="flex items-center gap-2 max-w-lg">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Código de Infração:</span>
              <span className="w-full truncate">
                {commandTrafficViolationCodeInputValue.violationCode && (
                  <span className="font-medium mr-2">
                    {commandTrafficViolationCodeInputValue.violationCode} -
                  </span>
                )}
                {
                  commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue
                }
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchTrafficViolationCodeInputValue({
                  trafficViolationCodeId: "",
                  searchTrafficViolationCodeInputValue: "",
                  violationCode: "",
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
          state.updateFineError?.trafficViolationCodeId
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

// Step 4: Update Fine Form
const UpdateFineContainer = ({
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
}: UpdateFineContainerProps): JSX.Element => {
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
  const [state, dispatch] = useFormState(handleUpdateFine, null);

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
          <SelectBusinessStep
            state={state ?? defaultState}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessStepContinue}
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
            onBack={handleBackToBusinessStep}
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
            <UpdateFineContainer
              state={state ?? defaultState}
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
