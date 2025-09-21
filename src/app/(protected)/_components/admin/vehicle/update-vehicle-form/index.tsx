import { useState, useEffect, useRef } from "react";

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

import { handleUpdateVehicle } from "@/actions/update-vehicle";

import { cn } from "@/lib/utils";
import { formatNumericInput } from "@/lib/format-values";

import { useUpdateVehicleForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchDriver } from "../../../search-driver";
import { SearchVehicleType } from "../../../search-vehicle-type";

import { SearchFuelType } from "../../../search-fuel-type";
import { DatePickerField, SelectField } from "../../../custom";

import {
  UpdateVehicleFormState,
  SelectBusinessByStepProps,
  UpdateVehicleFormProps,
  SelectDriverVehicleTypeStepProps,
  SelectFuelTypeStepProps,
  UpdateVehicleContainerProps,
} from "./dto";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

// Step 1: Select Business and Branch
const SelectBusinessStep = ({
  state,
  handleUpdateSearchBussinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue },
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
                onClick={() => ({
                  businessId: "",
                  searchBusinessInputValue: "",
                })}
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
            handleUpdateSearchBussinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.updateVehicleError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.updateVehicleError?.branchId}
            searchBranchInputValue={searchBranchInputValue}
            businessId={businessId}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            isOptional={true}
          />
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Driver and Vehicle Type (both optional)
const SelectDriverVehicleTypeStep = ({
  state,
  businessId,
  commandDriverInputValue,
  commandVehicleTypeInputValue,
  handleUpdateSearchDriverInputValue,
  handleUpdateSearchVehicleTypeInputValue,
  onContinue,
  onBack,
}: SelectDriverVehicleTypeStepProps) => {
  return (
    <div className="space-y-6">
      {/* Wrap in conditional & grid similar to SelectBusinessStep */}
      {(commandDriverInputValue.searchDriverInputValue ||
        commandVehicleTypeInputValue.searchVehicleTypeInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Display selected Driver if any */}
          {commandDriverInputValue.searchDriverInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Motorista:</span>
                <span className="w-full truncate">
                  {commandDriverInputValue.searchDriverInputValue}
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

          {/* Display selected Vehicle Type if any */}
          {commandVehicleTypeInputValue.searchVehicleTypeInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Tipo de Veículo:</span>
                <span className="w-full truncate">
                  {commandVehicleTypeInputValue.searchVehicleTypeInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchVehicleTypeInputValue({
                    vehicleTypeId: "",
                    searchVehicleTypeInputValue: "",
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
          <SearchDriver
            errorDriverId={state.updateVehicleError?.driverId}
            selectedDriverId={commandDriverInputValue.driverId}
            businessId={businessId}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            isOptional={true}
          />
        </div>

        {/* Vehicle Type Selection (Optional) */}
        <div>
          <SearchVehicleType
            errorVehicleTypeId={state.updateVehicleError?.vehicleTypeId}
            searchVehicleTypeInputValue={
              commandVehicleTypeInputValue.searchVehicleTypeInputValue
            }
            businessId={businessId}
            handleUpdateSearchVehicleTypeInputValue={
              handleUpdateSearchVehicleTypeInputValue
            }
            isOptional={true}
          />
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

// Step 3: Select Fuel Type (required)
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
      {/* Display selected Fuel Type if any */}
      {commandFuelTypeInputValue.searchFuelTypeInputValue && (
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
      )}

      {/* Fuel Type Selection (Required) */}
      <SearchFuelType
        errorFuelTypeId={state.updateVehicleError?.fuelTypeId}
        searchFuelTypeInputValue={
          commandFuelTypeInputValue.searchFuelTypeInputValue
        }
        businessId={businessId}
        handleUpdateSearchFuelTypeInputValue={
          handleUpdateSearchFuelTypeInputValue
        }
      />

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

// Step 4: Update Vehicle with all fields
const UpdateVehicleFormContainer = ({
  state,
  onBack,
  vehicleData,
  isBusinessAndBranchDirty,
  isUpdateVehicleOpen,
}: UpdateVehicleContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [formValues, setFormValues] = useState<Record<string, string | number>>(
    {},
  );
  const initialFormValuesRef = useRef<Record<string, string | number>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Initialize form values when the component mounts
  useEffect(() => {
    if (vehicleData && isUpdateVehicleOpen) {
      const initialValues = {
        description: vehicleData.description,
        license_plate: vehicleData.license_plate,
        brand: vehicleData.brand,
        model: vehicleData.model,
        acquisition_date: vehicleData.acquisition_date,
        fleet_type: vehicleData.fleet_type,
        last_maintenance_date:
          vehicleData.last_maintenance_date &&
          vehicleData.last_maintenance_date !== "N/A"
            ? vehicleData.last_maintenance_date
            : "",
        current_mileage: vehicleData.current_mileage,
        last_maintenance_mileage: vehicleData.last_maintenance_mileage,
        maintenance_interval_km: vehicleData.maintenance_interval_km,
        maintenance_interval_months: vehicleData.maintenance_interval_months,
        renavam: vehicleData.renavam,
        manufacturing_year: vehicleData.manufacturing_year,
        model_year: vehicleData.model_year,
        km_per_liter: vehicleData.km_per_liter,
        number_of_axles: vehicleData.number_of_axles,
        status: vehicleData.status,
      };

      setFormValues(initialValues);
      initialFormValuesRef.current = initialValues;
    }
  }, [vehicleData, isUpdateVehicleOpen]);

  // Helper function to normalize values for comparison
  const normalizeValue = (value: any): any => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" && value.trim() === "") return "";
    if (typeof value === "string" && !isNaN(Number(value)))
      return Number(value);
    return value;
  };

  // Function to handle changes in form fields
  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormValues((prev) => {
      // Convert string values to numbers for numeric fields
      let processedValue = value;

      if (
        typeof value === "string" &&
        [
          "current_mileage",
          "last_maintenance_mileage",
          "maintenance_interval_km",
          "maintenance_interval_months",
          "km_per_liter",
          "number_of_axles",
        ].includes(fieldName)
      ) {
        processedValue = value === "" ? "" : Number(value);
      }

      const newValues = { ...prev, [fieldName]: processedValue };

      // Check if any field has changed using normalized comparison with initial values
      const isAnyFieldChanged = Object.keys(initialFormValuesRef.current).some(
        (key) => {
          const initialValue = initialFormValuesRef.current[key];
          const currentValue = newValues[key];

          const normalizedInitial = normalizeValue(initialValue);
          const normalizedCurrent = normalizeValue(currentValue);

          return normalizedInitial !== normalizedCurrent;
        },
      );

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  // Function to handle changes in custom fields (select, datepicker)
  const handleCustomFieldChange =
    (fieldName: string) => (value: string | number) => {
      handleFieldChange(fieldName, value);
    };

  const licensePlateMask = (value: string) => {
    // Remove all characters that are not letters or numbers
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    // If there is no value, returns an empty mask
    if (!cleanValue) return "";

    // Mask for the first three letters (always present)
    if (cleanValue.length <= 3) {
      return cleanValue;
    }

    // If the 5th character (index 4) is a letter, apply a mask of the format ABC1D23
    if (cleanValue.length > 4 && /[A-Z]/.test(cleanValue[4])) {
      return `${cleanValue.slice(0, 3)}${cleanValue.slice(3, 4)}${cleanValue.slice(4, 5)}${cleanValue.slice(5, 7)}`;
    }

    // Otherwise, apply mask of format ABC1234
    return `${cleanValue.slice(0, 3)}${cleanValue.slice(3, 7)}`;
  };

  // Function to use with beforeMaskedValueChange
  const beforeMaskedValueChange = (newState: any) => {
    const { value } = newState;
    const licensePlate = licensePlateMask(value);

    return {
      ...newState,
      value: licensePlate,
    };
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Vehicle description */}
        <FormInput
          label="Descrição do veículo"
          htmlfor="description"
          name="description"
          type="text"
          placeholder="Digite a descrição do veículo"
          value={formValues.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          errorName={state.updateVehicleError?.description}
          disabled={pending}
        />

        {/* License plate */}
        <FormInput
          label="Placa do veículo"
          htmlfor="license_plate"
          name="license_plate"
          placeholder="ABC1234 ou ABC1D23"
          mask="***9*99"
          maskChar={null}
          beforeMaskedValueChange={beforeMaskedValueChange}
          type="text"
          value={formValues.license_plate || ""}
          onChange={(e) => handleFieldChange("license_plate", e.target.value)}
          errorName={state.updateVehicleError?.license_plate}
          disabled={pending}
        />

        {/* Brand */}
        <FormInput
          label="Marca"
          htmlfor="brand"
          name="brand"
          type="text"
          placeholder="Digite a marca do veículo"
          value={formValues.brand || ""}
          onChange={(e) => handleFieldChange("brand", e.target.value)}
          errorName={state.updateVehicleError?.brand}
          disabled={pending}
        />

        {/* Model */}
        <FormInput
          label="Modelo"
          htmlfor="model"
          name="model"
          type="text"
          placeholder="Digite o modelo do veículo"
          value={formValues.model || ""}
          onChange={(e) => handleFieldChange("model", e.target.value)}
          errorName={state.updateVehicleError?.model}
          disabled={pending}
        />

        {/* Acquisition date */}
        <DatePickerField
          label="Data de aquisição"
          htmlfor="acquisition_date"
          name="acquisition_date"
          value={formValues.acquisition_date?.toString() || ""}
          onChange={handleCustomFieldChange("acquisition_date")}
          errorName={state.updateVehicleError?.acquisition_date}
          disabled={pending}
        />

        <SelectField
          key={formValues.fleet_type}
          label="Tipo de frota"
          htmlfor="fleet_type"
          name="fleet_type"
          value={formValues.fleet_type?.toString() || ""}
          onChange={handleCustomFieldChange("fleet_type")}
          errorName={state.updateVehicleError?.fleet_type}
          disabled={pending}
          placeholder="Selecione o tipo da frota"
          options={[
            { value: "OWNED", label: "Própria" },
            { value: "THIRD_PARTY", label: "Terceirizada" },
          ]}
        />

        {/* Last maintenance date */}
        <DatePickerField
          label="Data da última manutenção (opcional)"
          htmlfor="last_maintenance_date"
          name="last_maintenance_date"
          value={formValues.last_maintenance_date?.toString() || ""}
          onChange={handleCustomFieldChange("last_maintenance_date")}
          errorName={state.updateVehicleError?.last_maintenance_date}
          disabled={pending}
        />

        {/* Current mileage */}
        <FormInput
          label="Quilometragem atual"
          htmlfor="current_mileage"
          name="current_mileage"
          type="number"
          min="0.1"
          max="9999999"
          step="0.1"
          placeholder="Digite a quilometragem atual"
          value={formValues.current_mileage || ""}
          onChange={(e) => handleFieldChange("current_mileage", e.target.value)}
          errorName={state.updateVehicleError?.current_mileage}
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        {/* Last maintenance mileage */}
        <FormInput
          label="Quilometragem da última revisão (opcional)"
          htmlfor="last_maintenance_mileage"
          name="last_maintenance_mileage"
          type="number"
          min="0.1"
          max="9999999"
          step="0.1"
          placeholder="Digite a quilometragem da última revisão"
          value={formValues.last_maintenance_mileage || ""}
          onChange={(e) =>
            handleFieldChange("last_maintenance_mileage", e.target.value)
          }
          errorName={state.updateVehicleError?.last_maintenance_mileage}
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        {/* Maintenance interval km */}
        <FormInput
          label="Revisão do veículo (km)"
          htmlfor="maintenance_interval_km"
          name="maintenance_interval_km"
          type="number"
          min="0.1"
          max="100000"
          step="0.1"
          placeholder="Digite a revisão do veículo em km"
          value={formValues.maintenance_interval_km || ""}
          onChange={(e) =>
            handleFieldChange("maintenance_interval_km", e.target.value)
          }
          errorName={state.updateVehicleError?.maintenance_interval_km}
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 100000, true)}
        />

        {/* Maintenance interval months */}
        <FormInput
          label="Intervalo de manutenção (meses)"
          htmlfor="maintenance_interval_months"
          name="maintenance_interval_months"
          type="number"
          min="1"
          max="60"
          step="1"
          inputMode="numeric"
          placeholder="Digite o intervalo de manutenção em meses"
          value={formValues.maintenance_interval_months || ""}
          onChange={(e) =>
            handleFieldChange("maintenance_interval_months", e.target.value)
          }
          errorName={state.updateVehicleError?.maintenance_interval_months}
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 60)}
        />

        {/* Renavam */}
        <FormInput
          label="Renavam"
          htmlfor="renavam"
          name="renavam"
          type="text"
          maxLength={11}
          placeholder="Digite o renavam do veículo"
          value={formValues.renavam || ""}
          onChange={(e) => handleFieldChange("renavam", e.target.value)}
          errorName={state.updateVehicleError?.renavam}
          disabled={pending}
        />

        {/* Manufacturing year */}
        <DatePickerField
          label="Ano de fabricação"
          htmlfor="manufacturing_year"
          name="manufacturing_year"
          value={formValues.manufacturing_year?.toString() || ""}
          onChange={handleCustomFieldChange("manufacturing_year")}
          errorName={state.updateVehicleError?.manufacturing_year}
          disabled={pending}
        />

        {/* Model year */}
        <DatePickerField
          label="Ano do modelo"
          htmlfor="model_year"
          name="model_year"
          value={formValues.model_year?.toString() || ""}
          onChange={handleCustomFieldChange("model_year")}
          errorName={state.updateVehicleError?.model_year}
          disabled={pending}
        />

        {/* Km per liter */}
        <FormInput
          label="Km por litro"
          htmlfor="km_per_liter"
          name="km_per_liter"
          type="number"
          min="1"
          max="50"
          step="1"
          placeholder="Digite os km por litro"
          value={formValues.km_per_liter || ""}
          onChange={(e) => handleFieldChange("km_per_liter", e.target.value)}
          errorName={state.updateVehicleError?.km_per_liter}
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 50)}
        />

        {/* Number of axles */}
        <FormInput
          label="Número de eixos"
          htmlfor="number_of_axles"
          name="number_of_axles"
          type="number"
          min="1"
          max="10"
          step="1"
          inputMode="numeric"
          value={formValues.number_of_axles || ""}
          onChange={(e) => handleFieldChange("number_of_axles", e.target.value)}
          errorName={state.updateVehicleError?.number_of_axles}
          placeholder="Digite o número de eixos"
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 10)}
        />

        <SelectField
          key={formValues.status}
          label="Status"
          htmlfor="status"
          name="status"
          value={formValues.status?.toString() || ""}
          onChange={handleCustomFieldChange("status")}
          errorName={state.updateVehicleError?.status}
          disabled={pending}
          placeholder="Selecione o status do veículo"
          options={[
            { value: "ACTIVE", label: "Ativo" },
            { value: "INACTIVE", label: "Inativo" },
            { value: "BLOCKED", label: "Bloqueado" },
            { value: "IN_ROUTE", label: "Em rota" },
          ]}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || (!isDirty && !isBusinessAndBranchDirty)}
        >
          <span>Atualizar Veículo</span>
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

const UpdateVehicleForm = ({
  vehicleData,
  handleCloseUpdateVehicle,
  isUpdateVehicleOpen,
}: UpdateVehicleFormProps): JSX.Element => {
  const defaultState: UpdateVehicleFormState = {};
  const [state, dispatch] = useFormState(handleUpdateVehicle, null);

  const {
    formRef,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBusinnessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBusinessAndBranchDirty,
  } = useUpdateVehicleForm({
    state,
    handleCloseUpdateVehicle,
    vehicleData,
    isUpdateVehicleOpen,
  });

  return (
    <Dialog
      open={isUpdateVehicleOpen}
      onOpenChange={() => {
        if (isUpdateVehicleOpen) {
          formRef.current?.reset();
        }
        handleCloseUpdateVehicle();
      }}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecionar Motorista e Tipo de Veículo"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Combustível"
                  : "Atualizar Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja editar um veículo (obrigatório) e opcionalmente uma filial."
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione opcionalmente um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do veículo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            state={state ?? defaultState}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBusinnessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinnessInputValue={commandBusinnessInputValue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : currentStep === "select-driver-vehicle-type" ? (
          <SelectDriverVehicleTypeStep
            state={state ?? defaultState}
            businessId={commandBusinnessInputValue.businessId}
            commandDriverInputValue={commandDriverInputValue}
            commandVehicleTypeInputValue={commandVehicleTypeInputValue}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            handleUpdateSearchVehicleTypeInputValue={
              handleUpdateSearchVehicleTypeInputValue
            }
            onContinue={handleDriverVehicleTypeStepContinue}
            onBack={handleBackToBusinessStep}
          />
        ) : currentStep === "select-fuel-type" ? (
          <SelectFuelTypeStep
            state={state ?? defaultState}
            businessId={commandBusinnessInputValue.businessId}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToDriverVehicleTypeStep}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                vehicleId: vehicleData.id,
                businessId: commandBusinnessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                driverId: commandDriverInputValue.driverId,
                vehicleTypeId: commandVehicleTypeInputValue.vehicleTypeId,
                fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateVehicleFormContainer
              state={state ?? defaultState}
              onBack={handleBackToFuelTypeStep}
              vehicleData={vehicleData}
              isBusinessAndBranchDirty={isBusinessAndBranchDirty}
              isUpdateVehicleOpen={isUpdateVehicleOpen}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleForm };
