import { useState, useEffect } from "react";
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
  DashboardCreateVehicleChecklistContainerProps,
  DashboardCreateVehicleChecklistFormState,
  DashboardSelectBranchStepProps,
  DashboardSelectVehicleDriverStepProps,
} from "./dto";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateVehicleChecklist } from "@/actions/create-vehicle-checklist";

import { formatMileage } from "@/lib/format-values";
import { DatePickerField } from "../../../custom";

import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchDriver } from "../../../search-driver";

import { useDashboardCreateVehicleChecklistForm } from "./hooks";

import { cn } from "@/lib/utils";

import { useFetchVehicleData } from "../../../search-vehicle-by-id-business";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { PhotoUpload } from "./components/photo-upload";
import {
  getPhotoRequirements,
  validateChecklistForm,
} from "./utils/photo-requirements";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

// Step 1: Select Branch
const DashboardSelectBranchStep = ({
  state,
  businessId,
  handleUpdateSearchBranchInputValue,
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: DashboardSelectBranchStepProps) => {
  return (
    <div className="space-y-6">
      {searchBranchInputValue && (
        <div className="grid grid-cols-1 gap-4 w-full">
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

      <div className={`grid grid-cols-1 gap-4`}>
        <SearchBranch
          errorBranchId={state.createVehicleChecklistError?.branchId}
          searchBranchInputValue={searchBranchInputValue}
          businessId={businessId}
          handleUpdateSearchBranchInputValue={
            handleUpdateSearchBranchInputValue
          }
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button type="button" onClick={onContinue} disabled={!branchId}>
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Vehicle and Driver
const DashboardSelectVehicleDriverStep = ({
  state,
  businessId,
  commandVehicleInputValue,
  commandDriverInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchDriverInputValue,
  onContinue,
  onBack,
}: DashboardSelectVehicleDriverStepProps) => {
  return (
    <div className="space-y-6">
      {/* Show selected items if any */}
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehicle Selection (Required) */}
        <div>
          <SearchVehicle
            errorVehicleId={state.createVehicleChecklistError?.vehicleId}
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
            errorDriverId={state.createVehicleChecklistError?.driverId}
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

// Step 3: Create Vehicle Checklist Form
const DashboardCreateVehicleChecklistFormContainer = ({
  state,
  onBack,
  commandBranchInputValue,
  commandVehicleInputValue,
  businessId,
  checklistFiles,
  setChecklistFiles,
  fileErrors,
  setFileErrors,
}: DashboardCreateVehicleChecklistContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, any>>({
    checklist_date: new Date().toISOString(),
  });

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: businessId,
  });

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const [displayMileage, setDisplayMileage] = useState<string>("");

  const handleMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const rawValue = e.target.value;

    const numbersOnly = rawValue.replace(/\D/g, "");
    const formatted = formatMileage(numbersOnly);

    setDisplayMileage(formatted);
    handleFieldChange("current_mileage", parseInt(numbersOnly) || 0);
  };

  const handleFilesChange = (fieldName: string) => (files: File[]) => {
    setChecklistFiles((prev) => ({
      ...prev,
      [fieldName]: files,
    }));

    // Clear error when files are added
    if (files.length > 0) {
      setFileErrors((prev) => ({
        ...prev,
        [fieldName]: null,
      }));
    }
  };

  // Get photo requirements based on current form values
  const photoRequirements = getPhotoRequirements(formValues);

  // Always render photo section to allow optional photos
  const renderPhotoSection = (fieldName: string, label: string) => {
    const requirement =
      photoRequirements[fieldName as keyof typeof photoRequirements];
    const files = checklistFiles[fieldName] || [];
    const isRequired = requirement?.required;

    return (
      <PhotoUpload
        fieldName={fieldName}
        label={label}
        isRequired={isRequired}
        files={files}
        onFilesChange={handleFilesChange(fieldName)}
        error={
          fileErrors[fieldName] ||
          state.createVehicleChecklistError?.[
            fieldName as keyof typeof state.createVehicleChecklistError
          ]?.[0]
        }
        pending={pending}
        reason={requirement?.reason}
      />
    );
  };

  // Check if form is valid for submission using helper function
  const { isValid: isFormValid } = validateChecklistForm(
    formValues,
    checklistFiles,
  );

  return (
    <>
      <div className="space-y-4 mt-5">
        {/* Selected Items Summary */}
        <div
          className="bg-white rounded-lg p-4 mb-6 border
          border-gray-200 dark:bg-gray-800 dark:border-gray-700"
        >
          <h3
            className="font-bold text-gray-900
            dark:text-gray-100 mb-3"
          >
            📋 Resumo da Seleção
          </h3>
          <div className="space-y-3">
            <div className="flex">
              <span
                className="text-sm text-gray-600
                dark:text-gray-400"
              >
                Filial:
              </span>
              <span
                className="text-sm text-gray-900
                dark:text-gray-100 flex-1 font-medium ml-2"
              >
                {commandBranchInputValue?.searchBranchInputValue || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span
                className="text-sm text-gray-600
                dark:text-gray-400"
              >
                Veículo:
              </span>
              <span
                className="text-sm text-gray-900
                dark:text-gray-100 flex-1 font-medium ml-2"
              >
                {commandVehicleInputValue?.searchVehicleInputValue || "N/A"}
                {commandVehicleInputValue?.vehicleLicensePlate && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Placa: {commandVehicleInputValue.vehicleLicensePlate})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div
          className="bg-blue-50 dark:bg-blue-950/20
          rounded-lg p-4 mb-6 border border-blue-200
          dark:border-blue-800"
        >
          <h3
            className="font-bold text-blue-900
            dark:text-blue-100 mb-3"
          >
            ℹ️ Informações importantes:
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              • Informe a quilometragem atual do veículo no momento da inspeção
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              • Fotos são obrigatórias para itens com problemas ou condições
              críticas
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              • Algumas fotos são sempre obrigatórias por questões legais
            </p>
          </div>
        </div>

        {/* Vehicle Data */}
        {data && !isLoadingVehicle && (
          <div
            className="bg-green-50 dark:bg-green-950/20
            rounded-lg p-4 mb-6 border border-green-200
            dark:border-green-800"
          >
            <h3
              className="font-bold text-green-900
              dark:text-green-100 mb-3"
            >
              🚗 Dados do Veículo Selecionado:
            </h3>
            <div className="space-y-1">
              <p
                className="text-sm text-green-800
                dark:text-green-200"
              >
                Quilometragem atual:{" "}
                {data.current_mileage?.toLocaleString() || "N/A"} km
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Placa: {data.license_plate || "N/A"}
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Modelo: {data.description || "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* Loading Vehicle Data */}
        {isLoadingVehicle && (
          <div
            className="bg-gray-50 dark:bg-gray-800 rounded-lg
            p-4 mb-6 border border-gray-200 dark:border-gray-700"
          >
            <p
              className="text-sm text-gray-600
              dark:text-gray-400 text-center"
            >
              Carregando dados do veículo...
            </p>
          </div>
        )}

        {/* Form Fields - Linear Layout like Mobile */}
        <div className="space-y-4">
          {/* Date */}
          <DatePickerField
            label="Data do Checklist"
            htmlfor="checklist_date"
            name="checklist_date"
            value={formValues.checklist_date || ""}
            onChange={handleCustomFieldChange("checklist_date")}
            errorName={state.createVehicleChecklistError?.checklist_date}
            disabled={pending}
          />

          {/* Current Mileage */}
          <FormInput
            label="Quilometragem Atual (km) *"
            htmlfor="current_mileage"
            name="current_mileage"
            type="text"
            placeholder="Ex: 50.000"
            errorName={state.createVehicleChecklistError?.current_mileage}
            disabled={pending}
            value={displayMileage}
            onChange={handleMileageChange}
          />

          {/* Current Mileage Photos - Always Required */}
          {renderPhotoSection("current_mileage", "Foto da Quilometragem")}

          {/* Tires Condition */}
          <div className="space-y-2">
            <Label htmlFor="tires_condition">Condição dos Pneus *</Label>
            <Select
              name="tires_condition"
              disabled={pending}
              value={formValues.tires_condition}
              onValueChange={(value) =>
                handleFieldChange("tires_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.tires_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.tires_condition[0]}
              </p>
            )}
          </div>

          {/* Tires Photos - Always Required */}
          {renderPhotoSection("tires_condition", "Foto dos Pneus")}

          {/* Fuel Level */}
          <div className="space-y-2">
            <Label htmlFor="fuel_level_adequate">
              Nível de Combustível Adequado *
            </Label>
            <Select
              name="fuel_level_adequate"
              disabled={pending}
              value={formValues.fuel_level_adequate?.toString()}
              onValueChange={(value) =>
                handleFieldChange("fuel_level_adequate", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.fuel_level_adequate && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.fuel_level_adequate[0]}
              </p>
            )}
          </div>

          {/* Fuel Level Photos - Always Required */}
          {renderPhotoSection(
            "fuel_level_adequate",
            "Foto do Nível de Combustível",
          )}

          {/* Headlights */}
          <div className="space-y-2">
            <Label htmlFor="headlights_working">Faróis Funcionando *</Label>
            <Select
              name="headlights_working"
              disabled={pending}
              value={formValues.headlights_working?.toString()}
              onValueChange={(value) =>
                handleFieldChange("headlights_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.headlights_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.headlights_working[0]}
              </p>
            )}
          </div>

          {/* Headlights Photos - Required if not OK */}
          {renderPhotoSection("headlights_working", "Foto dos Faróis")}

          {/* Taillights */}
          <div className="space-y-2">
            <Label htmlFor="taillights_working">
              Lanternas Traseiras Funcionando *
            </Label>
            <Select
              name="taillights_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("taillights_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.taillights_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.taillights_working[0]}
              </p>
            )}
          </div>

          {/* Taillights Photos */}
          {renderPhotoSection(
            "taillights_working",
            "Foto das Lanternas Traseiras",
          )}

          {/* Turn Signals */}
          <div className="space-y-2">
            <Label htmlFor="turn_signals_working">Setas Funcionando *</Label>
            <Select
              name="turn_signals_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("turn_signals_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.turn_signals_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.turn_signals_working[0]}
              </p>
            )}
          </div>

          {/* Turn Signals Photos */}
          {renderPhotoSection("turn_signals_working", "Foto das Setas")}

          {/* Bumpers Condition */}
          <div className="space-y-2">
            <Label htmlFor="bumpers_condition">
              Condição dos Para-choques *
            </Label>
            <Select
              name="bumpers_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("bumpers_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.bumpers_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.bumpers_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("bumpers_condition", "Foto dos Para-choques")}

          {/* Windshield Condition */}
          <div className="space-y-2">
            <Label htmlFor="windshield_condition">
              Condição do Para-brisa *
            </Label>
            <Select
              name="windshield_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("windshield_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.windshield_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.windshield_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("windshield_condition", "Foto do Para-brisa")}

          {/* Mirrors Condition */}
          <div className="space-y-2">
            <Label htmlFor="mirrors_condition">
              Condição dos Retrovisores *
            </Label>
            <Select
              name="mirrors_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("mirrors_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.mirrors_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.mirrors_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("mirrors_condition", "Foto dos Retrovisores")}

          {/* Seatbelts Working */}
          <div className="space-y-2">
            <Label htmlFor="seatbelts_working">
              Cintos de Segurança Funcionando *
            </Label>
            <Select
              name="seatbelts_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("seatbelts_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.seatbelts_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.seatbelts_working[0]}
              </p>
            )}
          </div>
          {renderPhotoSection(
            "seatbelts_working",
            "Foto dos Cintos de Segurança",
          )}

          {/* Dashboard Working */}
          <div className="space-y-2">
            <Label htmlFor="dashboard_working">Painel Funcionando *</Label>
            <Select
              name="dashboard_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("dashboard_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.dashboard_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.dashboard_working[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("dashboard_working", "Foto do Painel")}

          {/* Brakes */}
          <div className="space-y-2">
            <Label htmlFor="brakes_working">Freios Funcionando *</Label>
            <Select
              name="brakes_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("brakes_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.brakes_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.brakes_working[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("brakes_working", "Foto dos Freios")}

          {/* Clutch Working */}
          <div className="space-y-2">
            <Label htmlFor="clutch_working">Embreagem Funcionando *</Label>
            <Select
              name="clutch_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("clutch_working", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.clutch_working && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.clutch_working[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("clutch_working", "Foto da Embreagem")}

          {/* Oil Level Adequate */}
          <div className="space-y-2">
            <Label htmlFor="oil_level_adequate">Nível de Óleo Adequado *</Label>
            <Select
              name="oil_level_adequate"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("oil_level_adequate", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.oil_level_adequate && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.oil_level_adequate[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("oil_level_adequate", "Foto do Nível de Óleo")}

          {/* Radiator Water Adequate */}
          <div className="space-y-2">
            <Label htmlFor="radiator_water_adequate">
              Água do Radiador Adequada *
            </Label>
            <Select
              name="radiator_water_adequate"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("radiator_water_adequate", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.radiator_water_adequate && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.radiator_water_adequate[0]}
              </p>
            )}
          </div>
          {renderPhotoSection(
            "radiator_water_adequate",
            "Foto da Água do Radiador",
          )}

          {/* Brake Fluid Adequate */}
          <div className="space-y-2">
            <Label htmlFor="brake_fluid_adequate">
              Fluido de Freio Adequado *
            </Label>
            <Select
              name="brake_fluid_adequate"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("brake_fluid_adequate", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.brake_fluid_adequate && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.brake_fluid_adequate[0]}
              </p>
            )}
          </div>
          {renderPhotoSection(
            "brake_fluid_adequate",
            "Foto do Fluido de Freio",
          )}

          {/* Steering Wheel Condition */}
          <div className="space-y-2">
            <Label htmlFor="steering_wheel_condition">
              Condição do Volante *
            </Label>
            <Select
              name="steering_wheel_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("steering_wheel_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.steering_wheel_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.steering_wheel_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("steering_wheel_condition", "Foto do Volante")}

          {/* Battery Condition */}
          <div className="space-y-2">
            <Label htmlFor="battery_condition">Condição da Bateria *</Label>
            <Select
              name="battery_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("battery_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.battery_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.battery_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("battery_condition", "Foto da Bateria")}

          {/* Driver License Valid */}
          <div className="space-y-2">
            <Label htmlFor="driver_license_valid">CNH Válida *</Label>
            <Select
              name="driver_license_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("driver_license_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.driver_license_valid && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.driver_license_valid[0]}
              </p>
            )}
          </div>

          {/* Vehicle Documents Valid */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_documents_valid">
              Documentos do Veículo Válidos *
            </Label>
            <Select
              name="vehicle_documents_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("vehicle_documents_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.vehicle_documents_valid && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.vehicle_documents_valid[0]}
              </p>
            )}
          </div>

          {/* Insurance Valid */}
          <div className="space-y-2">
            <Label htmlFor="insurance_valid">Seguro Válido *</Label>
            <Select
              name="insurance_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("insurance_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.insurance_valid && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.insurance_valid[0]}
              </p>
            )}
          </div>

          {/* Fire Extinguisher Valid */}
          <div className="space-y-2">
            <Label htmlFor="fire_extinguisher_valid">Extintor Válido *</Label>
            <Select
              name="fire_extinguisher_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("fire_extinguisher_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.fire_extinguisher_valid && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.fire_extinguisher_valid[0]}
              </p>
            )}
          </div>

          {/* Warning Triangle Present */}
          <div className="space-y-2">
            <Label htmlFor="warning_triangle_present">
              Triângulo Presente *
            </Label>
            <Select
              name="warning_triangle_present"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("warning_triangle_present", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.warning_triangle_present && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.warning_triangle_present[0]}
              </p>
            )}
          </div>

          {/* Jack Present */}
          <div className="space-y-2">
            <Label htmlFor="jack_present">Macaco Presente *</Label>
            <Select
              name="jack_present"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("jack_present", value === "true")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.jack_present && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.jack_present[0]}
              </p>
            )}
          </div>

          {/* Spare Tire Condition */}
          <div className="space-y-2">
            <Label htmlFor="spare_tire_condition">Condição do Estepe *</Label>
            <Select
              name="spare_tire_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("spare_tire_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Bom</SelectItem>
                <SelectItem value="bad">Ruim</SelectItem>
                <SelectItem value="needs_attention">
                  Precisa de atenção
                </SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.spare_tire_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.spare_tire_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("spare_tire_condition", "Foto do Estepe")}

          {/* Overall Condition */}
          <div className="space-y-2">
            <Label htmlFor="overall_condition">
              Condição Geral do Veículo *
            </Label>
            <Select
              name="overall_condition"
              disabled={pending}
              value={formValues.overall_condition}
              onValueChange={(value) =>
                handleFieldChange("overall_condition", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a condição geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="approved_with_restrictions">
                  Aprovado com restrições
                </SelectItem>
                <SelectItem value="rejected">Reprovado</SelectItem>
              </SelectContent>
            </Select>
            {state.createVehicleChecklistError?.overall_condition && (
              <p className="text-sm text-red-500">
                {state.createVehicleChecklistError.overall_condition[0]}
              </p>
            )}
          </div>

          {/* Notes */}
          <FormInput
            label="Observações (Opcional)"
            htmlfor="notes"
            name="notes"
            type="text"
            errorName={state.createVehicleChecklistError?.notes}
            placeholder="Digite observações sobre o checklist..."
            disabled={pending}
            maxLength={500}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || isLoadingVehicle || !isFormValid}
        >
          <span>Criar Checklist</span>
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

const DashboardCreateVehicleChecklistForm = (): JSX.Element => {
  const defaultState: DashboardCreateVehicleChecklistFormState = {};
  const [state, dispatch] = useFormState(handleCreateVehicleChecklist, null);

  const [checklistFiles, setChecklistFiles] = useState<Record<string, File[]>>(
    {},
  );
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>(
    {},
  );

  const {
    isCreateVehicleChecklistForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
  } = useDashboardCreateVehicleChecklistForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  // Reset file states when modal closes or on success
  useEffect(() => {
    if (!isCreateVehicleChecklistForm) {
      setChecklistFiles({});
      setFileErrors({});
    }
  }, [isCreateVehicleChecklistForm]);

  // Reset file states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setChecklistFiles({});
      setFileErrors({});
    }
  }, [state?.successMessage]);

  return (
    <Dialog
      open={isCreateVehicleChecklistForm}
      onOpenChange={handleCloseDialog}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild data-tutorial="create-button">
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Checklist
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

      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : "Criar Novo Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja criar um checklist."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Preencha as informações do checklist veicular abaixo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <DashboardSelectBranchStep
            state={state ?? defaultState}
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <DashboardSelectVehicleDriverStep
            state={state ?? defaultState}
            businessId={businessId as string}
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
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              // Ensure mileage is sent unformatted
              const mileageInput = document.querySelector(
                'input[name="current_mileage"]',
              ) as HTMLInputElement;

              if (mileageInput && mileageInput.value.includes(".")) {
                // Remove points if still present
                const numericValue = mileageInput.value.replace(/\./g, "");
                mileageInput.value = numericValue;

                formData.set("current_mileage", numericValue);
              }

              const extraData = {
                businessId: businessId as string,
                branchId: commandBranchInputValue.branchId,
                vehicleId: commandVehicleInputValue.vehicleId,
                driverId: commandDriverInputValue.driverId,
              };

              // Add all checklist files to FormData with renamed files
              Object.entries(checklistFiles).forEach(([fieldName, files]) => {
                files.forEach((file, index) => {
                  // Create new file with mobile-like naming pattern: fieldName_timestamp_index.extension
                  const fileExtension = file.name.split(".").pop() || "jpg";
                  const newFileName = `${fieldName}_${Date.now()}_${index}.${fileExtension}`;

                  // Create a new File object with the new name
                  const renamedFile = new File([file], newFileName, {
                    type: file.type,
                  });

                  formData.append(fieldName, renamedFile);
                });
              });

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <DashboardCreateVehicleChecklistFormContainer
              state={state ?? defaultState}
              onBack={handleBackToVehicleDriverStep}
              commandBranchInputValue={commandBranchInputValue}
              commandVehicleInputValue={commandVehicleInputValue}
              businessId={businessId as string}
              checklistFiles={checklistFiles}
              setChecklistFiles={setChecklistFiles}
              fileErrors={fileErrors}
              setFileErrors={setFileErrors}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateVehicleChecklistForm };
