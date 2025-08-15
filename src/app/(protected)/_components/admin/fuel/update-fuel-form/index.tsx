import { useState, useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Info, Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateFuel } from "@/actions/update-fuel";

import { cn } from "@/lib/utils";
import {
  formatCurrencyToNumber,
  formatNumericInput,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useUpdateFuelForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchDriver } from "../../../search-driver";

import { SearchFuelType } from "../../../search-fuel-type";
import { DatePickerField } from "../../../custom";

import {
  UpdateFuelFormState,
  SelectBusinessBranchStepProps,
  UpdateFuelFormProps,
  SelectVehicleDriverStepProps,
  SelectFuelTypeStepProps,
  UpdateFuelContainerProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useFetchVehicleData } from "../../../search-vehicle-by-id-business";

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
          errorBusinessId={state.updateFuelError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.updateFuelError?.branchId}
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
      {/* Show selected vehicle and driver if any */}
      {(commandVehicleInputValue.searchVehicleInputValue ||
        commandDriverInputValue.searchDriverInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Display selected Vehicle if any */}
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

          {/* Display selected Driver if any */}
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
        {/* Vehicle Selection (Required) */}
        <div>
          <SearchVehicle
            errorVehicleId={state.updateFuelError?.vehicleId}
            selectedVehicleId={commandVehicleInputValue.vehicleId}
            businessId={businessId}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
          />
        </div>

        {/* Driver Selection (Required) */}
        <div>
          <SearchDriver
            errorDriverId={state.updateFuelError?.driverId}
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

// Step 3: Select Fuel Type
const SelectFuelTypeStep = ({
  state,
  businessId,
  commandFuelTypeInputValue,
  handleUpdateSearchFuelTypeInputValue,
  onContinue,
  onBack,
}: SelectFuelTypeStepProps) => {
  return (
    <div className="space-y-6">
      {/* Show selected Fuel Type if any */}
      {commandFuelTypeInputValue.searchFuelTypeInputValue && (
        <div className="grid grid-cols-1 gap-4 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Combustível:</span>
              <span className="w-full truncate">
                {commandFuelTypeInputValue.searchFuelTypeInputValue}
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchFuelTypeInputValue({
                  fuelTypeId: "",
                  searchFuelTypeInputValue: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Fuel Type Selection (Required) */}
        <div>
          <SearchFuelType
            errorFuelTypeId={state.updateFuelError?.fuelTypeId}
            searchFuelTypeInputValue={
              commandFuelTypeInputValue.searchFuelTypeInputValue
            }
            businessId={businessId}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
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
          disabled={!commandFuelTypeInputValue.fuelTypeId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 4: Update Fuel Form
const UpdateFuelContainer = ({
  state,
  onBack,
  fuelData,
  isBusinessAndEntityDirty,
  isUpdateFuelOpen,
  commandBusinessInputValue,
  commandVehicleInputValue,
}: UpdateFuelContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Fetch current vehicle data for validation
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || fuelData.vehicleId,
    businessId:
      commandBusinessInputValue.businessId || (fuelData.businessId as string),
  });

  // Initialize form values when the component mounts
  useEffect(() => {
    if (fuelData && isUpdateFuelOpen) {
      setFormValues({
        refueling_date: fuelData.refueling_date,
        current_mileage: fuelData.current_mileage.toString(),
        liters_amount: fuelData.liters_amount,
        price_per_liter: fuelData.price_per_liter,
        notes: fuelData.notes && fuelData.notes !== "N/A" ? fuelData.notes : "",
      });
    }
  }, [fuelData, isUpdateFuelOpen]);

  // Function to handle changes in form fields
  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormValues((prev) => {
      const stringValue = typeof value === "number" ? value.toString() : value;
      const newValues = { ...prev, [fieldName]: stringValue };

      // Check if any field has changed
      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue = fuelData[key as keyof typeof fuelData];

        // Special handling for notes
        if (key === "notes") {
          const originalIsEmpty = !originalValue || originalValue === "N/A";
          const newIsEmpty = !val;

          if (originalIsEmpty && newIsEmpty) return false;
          if (originalIsEmpty !== newIsEmpty) return true;

          return originalValue !== val;
        }

        if (typeof originalValue === "number") {
          return originalValue.toString() !== val;
        }

        return originalValue !== val;
      });

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value);
  };

  const [displayPricePerLiter, setDisplayPricePerLiter] = useState<string>(
    fuelData.price_per_liter || "",
  );

  useEffect(() => {
    if (fuelData && fuelData.price_per_liter) {
      setDisplayPricePerLiter(fuelData.price_per_liter);
    }
  }, [fuelData]);

  const handlePricePerLiterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayPricePerLiter(inputValue);
    handleFieldChange("price_per_liter", inputValue);
  };

  const handlePricePerLiterBlur = (): void => {
    if (
      !displayPricePerLiter ||
      displayPricePerLiter === "," ||
      displayPricePerLiter === "."
    ) {
      setDisplayPricePerLiter("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayPricePerLiter);
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayPricePerLiter(formattedValue);
    handleFieldChange("price_per_liter", formattedValue);
  };

  // Check if there are any changes in the form
  const hasAnyChange = isDirty || isBusinessAndEntityDirty;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Refueling Date */}
        <DatePickerField
          label="Data do abastecimento"
          htmlfor="refueling_date"
          name="refueling_date"
          value={formValues.refueling_date || ""}
          onChange={handleCustomFieldChange("refueling_date")}
          errorName={state.updateFuelError?.refueling_date}
          disabled={pending}
        />

        {/* Current Mileage */}
        <FormInput
          label="Quilometragem"
          htmlfor="current_mileage"
          name="current_mileage"
          type="number"
          value={formValues.current_mileage || ""}
          onChange={(e) => handleFieldChange("current_mileage", e.target.value)}
          errorName={state.updateFuelError?.current_mileage}
          disabled={pending}
          min="0.1"
          max="9999999"
          step="0.1"
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        {/* Liters Amount */}
        <FormInput
          label="Quantidade de litros"
          htmlfor="liters_amount"
          name="liters_amount"
          type="number"
          value={formValues.liters_amount || ""}
          onChange={(e) => handleFieldChange("liters_amount", e.target.value)}
          errorName={state.updateFuelError?.liters_amount}
          disabled={pending}
          min="0.001"
          max="99999.999"
          step="0.001"
          onInput={(event) => formatNumericInput(event, 99999.999, true)}
        />

        {/* Price per Liter */}
        <FormInput
          label="Preço por litro"
          htmlfor="price_per_liter"
          name="price_per_liter"
          type="text"
          errorName={state.updateFuelError?.price_per_liter}
          value={displayPricePerLiter}
          onChange={handlePricePerLiterChange}
          onBlur={handlePricePerLiterBlur}
          disabled={pending}
        />

        {/* Notes */}
        <div className="col-span-2">
          <FormInput
            label="Observações (opcional)"
            htmlfor="notes"
            name="notes"
            type="text"
            value={formValues.notes || ""}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            errorName={state.updateFuelError?.notes}
            disabled={pending}
            maxLength={500}
          />
        </div>

        {/* Information Alert */}
        <div className="col-span-2 mt-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>ℹ️ Informações importantes:</strong>
              <br />
              • A quilometragem não pode ser menor que a atual do veículo
              <br />
              • O valor total será recalculado automaticamente (litros × preço
              por litro)
              <br />• Alterações na quilometragem atualizarão o veículo
            </AlertDescription>
          </Alert>
        </div>

        {/* Current Vehicle Info */}
        {data && (
          <div
            className="col-span-2 mt-4 p-4 bg-green-50 
            dark:bg-green-900/20 rounded-lg border border-green-200"
          >
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>🚗 Dados Atuais do Veículo:</strong>
              <br />
              Quilometragem atual: {data.current_mileage.toLocaleString()} km
              <br />
              Intervalo de manutenção:{" "}
              {data.maintenance_interval_km.toLocaleString()} km
              {data.last_maintenance_mileage && (
                <>
                  <br />
                  Última manutenção:{" "}
                  {data.last_maintenance_mileage.toLocaleString()} km
                </>
              )}
            </p>
          </div>
        )}

        {/* History Information */}
        <div className="col-span-2 mt-4">
          <div
            className="bg-purple-50 dark:bg-purple-900/20 
            p-4 rounded-lg border border-purple-200"
          >
            <h4
              className="font-semibold text-purple-700 
              dark:text-purple-300 mb-2"
            >
              📊 Informações de Controle:
            </h4>
            <div
              className="text-sm text-purple-600 
              dark:text-purple-400 space-y-1"
            >
              <div>
                • <strong>Data de criação:</strong> {fuelData.created_at}
              </div>
              <div>
                • <strong>Última atualização:</strong> {fuelData.updated_at}
              </div>
              <div>
                • <strong>Odômetro verificado:</strong>{" "}
                {fuelData.odometer_verified ? "✅ Sim" : "❌ Não"}
              </div>
              <div>
                • <strong>Valor total atual:</strong> {fuelData.total_amount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || !hasAnyChange || isLoadingVehicle}
        >
          <span>Atualizar Abastecimento</span>
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

const UpdateFuelForm = ({
  fuelData,
  handleCloseUpdateFuel,
  isUpdateFuelOpen,
}: UpdateFuelFormProps): JSX.Element => {
  const defaultState: UpdateFuelFormState = {};
  const [state, dispatch] = useFormState(handleUpdateFuel, null);

  const {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBusinessAndEntityDirty,
  } = useUpdateFuelForm({
    state,
    handleCloseUpdateFuel,
    fuelData,
    isUpdateFuelOpen,
  });

  return (
    <Dialog
      open={isUpdateFuelOpen}
      onOpenChange={() => {
        if (isUpdateFuelOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateFuel();
      }}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Tipo de Combustível"
                  : "Atualizar Abastecimento"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja atualizar o abastecimento."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o abastecimento."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do abastecimento."}
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
        ) : currentStep === "select-fuel-type" ? (
          <SelectFuelTypeStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToVehicleDriverStep}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                fuelId: fuelData.id,
                businessId: commandBusinessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                vehicleId: commandVehicleInputValue.vehicleId,
                driverId: commandDriverInputValue.driverId,
                fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateFuelContainer
              state={state ?? defaultState}
              onBack={handleBackToFuelTypeStep}
              fuelData={fuelData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateFuelOpen={isUpdateFuelOpen}
              commandVehicleInputValue={commandVehicleInputValue}
              commandBusinessInputValue={commandBusinessInputValue}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateFuelForm };
