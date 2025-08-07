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

import {
  CreateVehicleContainerProps,
  CreateVehicleFormState,
  SelectBusinessByStepProps,
  SelectDriverVehicleTypeStepProps,
  SelectFuelTypeStepProps,
} from "./dto";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateVehicle } from "@/actions/create-vehicle";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchDriver } from "../../../search-driver";
import { SearchVehicleType } from "../../../search-vehicle-type";

import { SearchFuelType } from "../../../search-fuel-type";

import { useCreateVehicleForm } from "./hooks";
import { cn } from "@/lib/utils";

import { DatePickerField, SelectField } from "../../../custom";
import { formatNumericInput } from "@/lib/format-values";

// Step 1: Select Business and Branch
const SelectBusinessStep = ({
  state,
  handleUpdateSearchBusinnessInputValue,
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
                onClick={() =>
                  handleUpdateSearchBusinnessInputValue({
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
            handleUpdateSearchBusinnessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.createVehicleError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.createVehicleError?.branchId}
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
        {/* Driver Selection (Optional) */}
        <div>
          <SearchDriver
            errorDriverId={state.createVehicleError?.driverId}
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
            errorVehicleTypeId={state.createVehicleError?.vehicleTypeId}
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
        errorFuelTypeId={state.createVehicleError?.fuelTypeId}
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

// Step 4: Create Vehicle with all fields
const CreateVehicleFormContainer = ({
  state,
  onBack,
}: CreateVehicleContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Function to handle changes in custom fields (select, datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
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
          errorName={state.createVehicleError?.description}
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
          errorName={state.createVehicleError?.license_plate}
          disabled={pending}
        />

        {/* Brand */}
        <FormInput
          label="Marca"
          htmlfor="brand"
          name="brand"
          type="text"
          placeholder="Digite a marca do veículo"
          errorName={state.createVehicleError?.brand}
          disabled={pending}
        />

        {/* Model */}
        <FormInput
          label="Modelo"
          htmlfor="model"
          name="model"
          type="text"
          placeholder="Digite o modelo do veículo"
          errorName={state.createVehicleError?.model}
          disabled={pending}
        />

        {/* Acquisition date */}
        <DatePickerField
          label="Data de aquisição"
          htmlfor="acquisition_date"
          name="acquisition_date"
          value={formValues.acquisition_date || ""}
          onChange={handleCustomFieldChange("acquisition_date")}
          errorName={state.createVehicleError?.acquisition_date}
          disabled={pending}
        />

        <SelectField
          label="Tipo de frota"
          htmlfor="fleet_type"
          name="fleet_type"
          errorName={state.createVehicleError?.fleet_type}
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
          value={formValues.last_maintenance_date || ""}
          onChange={handleCustomFieldChange("last_maintenance_date")}
          errorName={state.createVehicleError?.last_maintenance_date}
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
          errorName={state.createVehicleError?.current_mileage}
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
          errorName={state.createVehicleError?.last_maintenance_mileage}
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
          errorName={state.createVehicleError?.maintenance_interval_km}
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
          errorName={state.createVehicleError?.maintenance_interval_months}
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
          errorName={state.createVehicleError?.renavam}
          disabled={pending}
        />

        {/* Manufacturing year */}
        <DatePickerField
          label="Ano de fabricação"
          htmlfor="manufacturing_year"
          name="manufacturing_year"
          value={formValues.manufacturing_year || ""}
          onChange={handleCustomFieldChange("manufacturing_year")}
          errorName={state.createVehicleError?.manufacturing_year}
          disabled={pending}
        />

        {/* Model year */}
        <DatePickerField
          label="Ano do modelo"
          htmlfor="model_year"
          name="model_year"
          value={formValues.model_year || ""}
          onChange={handleCustomFieldChange("model_year")}
          errorName={state.createVehicleError?.model_year}
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
          errorName={state.createVehicleError?.km_per_liter}
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
          errorName={state.createVehicleError?.number_of_axles}
          placeholder="Digite o número de eixos"
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 10)}
        />

        <SelectField
          label="Status"
          htmlfor="status"
          name="status"
          errorName={state.createVehicleError?.status}
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
        <Button type="submit" disabled={pending}>
          <span>Criar Veículo</span>
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

const CreateVehicleForm = (): JSX.Element => {
  const defaultState: CreateVehicleFormState = {};
  const [state, dispatch] = useFormState(handleCreateVehicle, null);

  const {
    isCreateVehicleForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleUpdateSearchBusinnessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
  } = useCreateVehicleForm(state);

  return (
    <Dialog open={isCreateVehicleForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild data-tutorial="create-button">
        <Button size="sm" className="h-8">
          Criar Veículo
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecionar Motorista e Tipo de Veículo"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Combustível"
                  : "Criar Novo Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja criar um veículo (obrigatório) e opcionalmente uma filial."
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione opcionalmente um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Insira as informações solicitadas abaixo para concluir a criação do veículo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            state={state ?? defaultState}
            handleUpdateSearchBusinnessInputValue={
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
              // Add selected IDs to form data
              formData.append(
                "businessId",
                commandBusinnessInputValue.businessId,
              );

              if (commandBranchInputValue.branchId) {
                formData.append("branchId", commandBranchInputValue.branchId);
              }

              if (commandDriverInputValue.driverId) {
                formData.append("driverId", commandDriverInputValue.driverId);
              }

              if (commandVehicleTypeInputValue.vehicleTypeId) {
                formData.append(
                  "vehicleTypeId",
                  commandVehicleTypeInputValue.vehicleTypeId,
                );
              }

              if (commandFuelTypeInputValue.fuelTypeId) {
                formData.append(
                  "fuelTypeId",
                  commandFuelTypeInputValue.fuelTypeId,
                );
              }

              dispatch(formData);
            }}
          >
            <CreateVehicleFormContainer
              state={state ?? defaultState}
              onBack={handleBackToFuelTypeStep}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateVehicleForm };
