import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

import { formatMileage } from "@/lib/format-values";
import FormInput from "@/components/custom/form-input";

import { DatePickerField } from "../../../../custom";
import { useFetchVehicleData } from "../../../../search-vehicle-by-id-business";

import { PhotoUpload } from "../components/photo-upload";
import {
  getPhotoRequirements,
  validateChecklistForm,
} from "../utils/photo-requirements";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateVehicleChecklistFormSubmitProps } from "../dto";

const CreateVehicleChecklistFormSubmit = ({
  state,
  onBack,
  commandBusinessInputValue,
  commandBranchInputValue,
  commandVehicleInputValue,
  checklistFiles,
  setChecklistFiles,
  fileErrors,
  setFileErrors,
}: CreateVehicleChecklistFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, any>>({
    checklist_date: new Date().toISOString(),
  });

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: commandBusinessInputValue.businessId,
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
            <div className="text-sm font-medium">Condição dos Pneus *</div>
            <Select
              name="tires_condition"
              disabled={pending}
              value={formValues.tires_condition}
              onValueChange={(value) =>
                handleFieldChange("tires_condition", value)
              }
            >
              <SelectTrigger className="w-full" aria-label="Condição dos Pneus">
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
            <div className="text-sm font-medium">
              Nível de Combustível Adequado *
            </div>
            <Select
              name="fuel_level_adequate"
              disabled={pending}
              value={formValues.fuel_level_adequate?.toString()}
              onValueChange={(value) =>
                handleFieldChange("fuel_level_adequate", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Nível de Combustível Adequado"
              >
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
            <div className="text-sm font-medium">Faróis Funcionando *</div>
            <Select
              name="headlights_working"
              disabled={pending}
              value={formValues.headlights_working?.toString()}
              onValueChange={(value) =>
                handleFieldChange("headlights_working", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Faróis Funcionando">
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
            <div className="text-sm font-medium">
              Lanternas Traseiras Funcionando *
            </div>
            <Select
              name="taillights_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("taillights_working", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Lanternas Traseiras Funcionando"
              >
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
            <div className="text-sm font-medium">Setas Funcionando *</div>
            <Select
              name="turn_signals_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("turn_signals_working", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Setas Funcionando">
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
            <div className="text-sm font-medium">
              Condição dos Para-choques *
            </div>
            <Select
              name="bumpers_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("bumpers_condition", value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Condição dos Para-choques"
              >
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
            <div className="text-sm font-medium">Condição do Para-brisa *</div>
            <Select
              name="windshield_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("windshield_condition", value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Condição do Para-brisa"
              >
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
            <div className="text-sm font-medium">
              Condição dos Retrovisores *
            </div>
            <Select
              name="mirrors_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("mirrors_condition", value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Condição dos Retrovisores"
              >
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
            <div className="text-sm font-medium">
              Cintos de Segurança Funcionando *
            </div>
            <Select
              name="seatbelts_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("seatbelts_working", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Cintos de Segurança Funcionando"
              >
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
            <div className="text-sm font-medium">Painel Funcionando *</div>
            <Select
              name="dashboard_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("dashboard_working", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Painel Funcionando">
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
            <div className="text-sm font-medium">Freios Funcionando *</div>
            <Select
              name="brakes_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("brakes_working", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Freios Funcionando">
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
            <div className="text-sm font-medium">Embreagem Funcionando *</div>
            <Select
              name="clutch_working"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("clutch_working", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Embreagem Funcionando"
              >
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
            <div className="text-sm font-medium">Nível de Óleo Adequado *</div>
            <Select
              name="oil_level_adequate"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("oil_level_adequate", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Nível de Óleo Adequado"
              >
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
            <div className="text-sm font-medium">
              Água do Radiador Adequada *
            </div>
            <Select
              name="radiator_water_adequate"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("radiator_water_adequate", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Água do Radiador Adequada"
              >
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
            <div className="text-sm font-medium">
              Fluido de Freio Adequado *
            </div>
            <Select
              name="brake_fluid_adequate"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("brake_fluid_adequate", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Fluido de Freio Adequado"
              >
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
            <div className="text-sm font-medium">Condição do Volante *</div>
            <Select
              name="steering_wheel_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("steering_wheel_condition", value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Condição do Volante"
              >
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
            <div className="text-sm font-medium">Condição da Bateria *</div>
            <Select
              name="battery_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("battery_condition", value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Condição da Bateria"
              >
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
            <div className="text-sm font-medium">CNH Válida *</div>
            <Select
              name="driver_license_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("driver_license_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="CNH Válida">
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
            <div className="text-sm font-medium">
              Documentos do Veículo Válidos *
            </div>
            <Select
              name="vehicle_documents_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("vehicle_documents_valid", value === "true")
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Documentos do Veículo Válidos"
              >
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
            <div className="text-sm font-medium">Seguro Válido *</div>
            <Select
              name="insurance_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("insurance_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Seguro Válido">
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
            <div className="text-sm font-medium">Extintor Válido *</div>
            <Select
              name="fire_extinguisher_valid"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("fire_extinguisher_valid", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Extintor Válido">
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
            <div className="text-sm font-medium">Triângulo Presente *</div>
            <Select
              name="warning_triangle_present"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("warning_triangle_present", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Triângulo Presente">
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
            <div className="text-sm font-medium">Macaco Presente *</div>
            <Select
              name="jack_present"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("jack_present", value === "true")
              }
            >
              <SelectTrigger className="w-full" aria-label="Macaco Presente">
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
            <div className="text-sm font-medium">Condição do Estepe *</div>
            <Select
              name="spare_tire_condition"
              disabled={pending}
              onValueChange={(value) =>
                handleFieldChange("spare_tire_condition", value)
              }
            >
              <SelectTrigger className="w-full" aria-label="Condição do Estepe">
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
            <div className="text-sm font-medium">
              Condição Geral do Veículo *
            </div>
            <Select
              name="overall_condition"
              disabled={pending}
              value={formValues.overall_condition}
              onValueChange={(value) =>
                handleFieldChange("overall_condition", value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Condição Geral do Veículo"
              >
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

export { CreateVehicleChecklistFormSubmit };
