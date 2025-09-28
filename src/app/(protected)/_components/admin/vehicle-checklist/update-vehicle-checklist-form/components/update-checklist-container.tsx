import { useState, useEffect, useMemo } from "react";
import { useFormStatus } from "react-dom";

import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { formatMileage } from "@/lib/format-values";

import { useFetchVehicleData } from "../../../../search-vehicle-by-id-business";
import { DatePickerField } from "../../../../custom";

import { UpdateVehicleChecklistContainerProps } from "../dto";
import { getPhotoRequirements } from "../../create-vehicle-checklist-form/utils/photo-requirements";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { PhotoUpload } from "./photo-upload";

// Step 3: Update Vehicle Checklist Form - Following CREATE layout
const UpdateChecklistContainer = ({
  state,
  onBack,
  checklistData,
  isBusinessAndEntityDirty,
  isUpdateChecklistOpen,
  commandBusinessInputValue,
  commandBranchInputValue,
  commandVehicleInputValue,
  commandDriverInputValue,
  checklistFiles,
  setChecklistFiles,
  fileErrors,
  setFileErrors,
  photosToRemove,
  setPhotosToRemove,
}: UpdateVehicleChecklistContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Fetch current vehicle data for validation
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || checklistData.vehicleId,
    businessId:
      commandBusinessInputValue.businessId ||
      (checklistData.businessId as string),
  });

  // Initialize form values immediately with useMemo for stability
  const initialFormValues = useMemo(() => {
    if (!checklistData) return {};

    return {
      checklist_date: checklistData.checklist_date,
      current_mileage: checklistData.current_mileage?.toString() || "",
      tires_condition: checklistData.tires_condition,
      headlights_working: checklistData.headlights_working,
      taillights_working: checklistData.taillights_working,
      turn_signals_working: checklistData.turn_signals_working,
      bumpers_condition: checklistData.bumpers_condition,
      windshield_condition: checklistData.windshield_condition,
      mirrors_condition: checklistData.mirrors_condition,
      seatbelts_working: checklistData.seatbelts_working,
      dashboard_working: checklistData.dashboard_working,
      steering_wheel_condition: checklistData.steering_wheel_condition,
      brakes_working: checklistData.brakes_working,
      clutch_working: checklistData.clutch_working,
      fuel_level_adequate: checklistData.fuel_level_adequate,
      oil_level_adequate: checklistData.oil_level_adequate,
      radiator_water_adequate: checklistData.radiator_water_adequate,
      brake_fluid_adequate: checklistData.brake_fluid_adequate,
      battery_condition: checklistData.battery_condition,
      driver_license_valid: checklistData.driver_license_valid,
      vehicle_documents_valid: checklistData.vehicle_documents_valid,
      insurance_valid: checklistData.insurance_valid,
      fire_extinguisher_valid: checklistData.fire_extinguisher_valid,
      warning_triangle_present: checklistData.warning_triangle_present,
      jack_present: checklistData.jack_present,
      spare_tire_condition: checklistData.spare_tire_condition,
      overall_condition: checklistData.overall_condition,
      notes:
        checklistData.notes && checklistData.notes !== "N/A"
          ? checklistData.notes
          : "",
    };
  }, [checklistData?.id]); // Only depend on stable ID

  const [formValues, setFormValues] =
    useState<Record<string, any>>(initialFormValues);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Reset form values only when modal opens/closes or checklist changes
  useEffect(() => {
    if (isUpdateChecklistOpen && checklistData) {
      setFormValues(initialFormValues);
      setIsDirty(false); // Reset dirty state when modal opens
    }
  }, [isUpdateChecklistOpen, initialFormValues]);

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [fieldName]: value };

      // Check if any field has changed from original values
      const isAnyFieldChanged = Object.keys(newValues).some((key) => {
        const currentValue = newValues[key];
        const originalValue = (initialFormValues as Record<string, any>)[key];

        // Skip comparison if no original data is available yet
        if (!checklistData || originalValue === undefined) {
          return false;
        }

        // Handle different value types (string, boolean, number)
        if (
          typeof currentValue === "boolean" &&
          typeof originalValue === "boolean"
        ) {
          return currentValue !== originalValue;
        }

        // Handle numeric values (e.g., current_mileage)
        if (key === "current_mileage") {
          const currentNumeric =
            typeof currentValue === "number"
              ? currentValue
              : parseInt(currentValue) || 0;
          const originalNumeric =
            typeof originalValue === "number"
              ? originalValue
              : parseInt(originalValue) || 0;
          return currentNumeric !== originalNumeric;
        }

        // Handle date values specifically
        if (key === "checklist_date") {
          const currentDate = currentValue?.toString() || "";
          const originalDate = originalValue?.toString() || "";

          // If both are empty or falsy, they're the same
          if (!currentDate && !originalDate) {
            return false;
          }

          // If one is empty and the other isn't, they're different
          if (!currentDate || !originalDate) {
            return true;
          }

          // Normalize dates to YYYY-MM-DD format for comparison
          try {
            const currentDateOnly = currentDate.split("T")[0];
            const originalDateOnly = originalDate.split("T")[0];
            return currentDateOnly !== originalDateOnly;
          } catch {
            // Fallback to string comparison if parsing fails
            return currentDate !== originalDate;
          }
        }

        // Handle string values
        const currentStr = currentValue?.toString() || "";
        const originalStr = originalValue?.toString() || "";
        return currentStr !== originalStr;
      });

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  // Helper function to get safe value for selects (prevents undefined/null issues)
  const getSafeSelectValue = (value: any, isBoolean = false): string => {
    if (isBoolean) {
      return value !== undefined && value !== null ? String(value) : "";
    }
    return value || "";
  };

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value);
  };

  const [displayMileage, setDisplayMileage] = useState<string>("");

  // Initialize display values
  useEffect(() => {
    if (checklistData && isUpdateChecklistOpen) {
      setDisplayMileage(
        checklistData.current_mileage
          ? formatMileage(checklistData.current_mileage.toString())
          : "",
      );
    }
  }, [checklistData, isUpdateChecklistOpen]);

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

  // Get photo requirements based on current form values - using same logic as create
  const photoRequirements = useMemo(
    () => getPhotoRequirements(formValues),
    [formValues],
  );

  // Helper function to get existing photos for a specific field
  const getExistingPhotosForField = (fieldName: string): string[] => {
    if (!checklistData.photos) return [];

    // Filter photos that contain the field name in their URL/path
    return checklistData.photos.filter((photoUrl) =>
      photoUrl.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  // Handle existing photo removal
  const handleExistingPhotoRemove = (photoUrl: string) => {
    setPhotosToRemove((prev) => {
      const newList = [...prev, photoUrl];
      return newList;
    });
  };

  // Render photo section - enhanced for update with existing photos
  const renderPhotoSection = (fieldName: string, label: string) => {
    const requirement =
      photoRequirements[fieldName as keyof typeof photoRequirements];

    const files = checklistFiles[fieldName] || [];
    const existingPhotos = getExistingPhotosForField(fieldName).filter(
      (photoUrl) => !photosToRemove.includes(photoUrl),
    );
    const isRequired = requirement?.required;

    return (
      <PhotoUpload
        fieldName={fieldName}
        label={label}
        isRequired={isRequired}
        files={files}
        existingPhotos={existingPhotos}
        onFilesChange={handleFilesChange(fieldName)}
        onExistingPhotoRemove={handleExistingPhotoRemove}
        error={
          fileErrors[fieldName] ||
          state.updateVehicleChecklistError?.[
            fieldName as keyof typeof state.updateVehicleChecklistError
          ]?.[0]
        }
        pending={pending}
        reason={requirement?.reason}
      />
    );
  };

  // Check if there are any changes
  const hasFileChange = Object.keys(checklistFiles).some(
    (key) => checklistFiles[key].length > 0,
  );
  const hasPhotoRemoval = photosToRemove.length > 0;
  const hasAnyChange =
    isDirty || isBusinessAndEntityDirty || hasFileChange || hasPhotoRemoval;

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
                {commandBranchInputValue?.searchBranchInputValue ||
                  checklistData.branch_name ||
                  "N/A"}
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
                {commandVehicleInputValue?.searchVehicleInputValue ||
                  checklistData.vehicle_description ||
                  "N/A"}
                {(commandVehicleInputValue?.vehicleLicensePlate ||
                  checklistData.vehicle_license_plate) && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Placa:{" "}
                    {commandVehicleInputValue.vehicleLicensePlate ||
                      checklistData.vehicle_license_plate}
                    )
                  </span>
                )}
              </span>
            </div>
            <div className="flex">
              <span
                className="text-sm text-gray-600
                dark:text-gray-400"
              >
                Motorista:
              </span>
              <span
                className="text-sm text-gray-900
                dark:text-gray-100 flex-1 font-medium ml-2"
              >
                {commandDriverInputValue?.searchDriverInputValue ||
                  checklistData.driver_name ||
                  "N/A"}
                {(commandDriverInputValue?.driverCnh ||
                  checklistData.driver_cnh) && (
                  <span className="text-xs text-gray-500 ml-2">
                    (CNH:{" "}
                    {commandDriverInputValue.driverCnh ||
                      checklistData.driver_cnh}
                    )
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Current Vehicle Info */}
        {data && !isLoadingVehicle && (
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
              • Altere apenas os campos que precisam ser atualizados
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              • Fotos são obrigatórias para itens com problemas ou condições
              críticas
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              • A quilometragem atual será atualizada no veículo se alterada
            </p>
          </div>
        </div>

        {/* Form Fields - Linear Layout like Create */}
        <div className="space-y-4">
          {/* Date */}
          <DatePickerField
            label="Data do Checklist"
            htmlfor="checklist_date"
            name="checklist_date"
            value={formValues.checklist_date || ""}
            onChange={handleCustomFieldChange("checklist_date")}
            errorName={state.updateVehicleChecklistError?.checklist_date}
            disabled={pending}
          />

          {/* Current Mileage */}
          <FormInput
            label="Quilometragem Atual (km) *"
            htmlfor="current_mileage"
            name="current_mileage"
            type="text"
            placeholder="Ex: 50.000"
            errorName={state.updateVehicleChecklistError?.current_mileage}
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
              value={getSafeSelectValue(formValues.tires_condition)}
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
            {state.updateVehicleChecklistError?.tires_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.tires_condition[0]}
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
              value={getSafeSelectValue(formValues.fuel_level_adequate, true)}
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
            {state.updateVehicleChecklistError?.fuel_level_adequate && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.fuel_level_adequate[0]}
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
              value={getSafeSelectValue(formValues.headlights_working, true)}
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
            {state.updateVehicleChecklistError?.headlights_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.headlights_working[0]}
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
              value={getSafeSelectValue(formValues.taillights_working, true)}
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
            {state.updateVehicleChecklistError?.taillights_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.taillights_working[0]}
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
              value={getSafeSelectValue(formValues.turn_signals_working, true)}
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
            {state.updateVehicleChecklistError?.turn_signals_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.turn_signals_working[0]}
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
              value={getSafeSelectValue(formValues.bumpers_condition)}
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
            {state.updateVehicleChecklistError?.bumpers_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.bumpers_condition[0]}
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
              value={getSafeSelectValue(formValues.windshield_condition)}
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
            {state.updateVehicleChecklistError?.windshield_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.windshield_condition[0]}
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
              value={getSafeSelectValue(formValues.mirrors_condition)}
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
            {state.updateVehicleChecklistError?.mirrors_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.mirrors_condition[0]}
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
              value={getSafeSelectValue(formValues.seatbelts_working, true)}
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
            {state.updateVehicleChecklistError?.seatbelts_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.seatbelts_working[0]}
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
              value={getSafeSelectValue(formValues.dashboard_working, true)}
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
            {state.updateVehicleChecklistError?.dashboard_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.dashboard_working[0]}
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
              value={getSafeSelectValue(formValues.brakes_working, true)}
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
            {state.updateVehicleChecklistError?.brakes_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.brakes_working[0]}
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
              value={getSafeSelectValue(formValues.clutch_working, true)}
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
            {state.updateVehicleChecklistError?.clutch_working && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.clutch_working[0]}
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
              value={getSafeSelectValue(formValues.oil_level_adequate, true)}
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
            {state.updateVehicleChecklistError?.oil_level_adequate && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.oil_level_adequate[0]}
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
              value={getSafeSelectValue(
                formValues.radiator_water_adequate,
                true,
              )}
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
            {state.updateVehicleChecklistError?.radiator_water_adequate && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.radiator_water_adequate[0]}
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
              value={getSafeSelectValue(formValues.brake_fluid_adequate, true)}
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
            {state.updateVehicleChecklistError?.brake_fluid_adequate && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.brake_fluid_adequate[0]}
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
              value={getSafeSelectValue(formValues.steering_wheel_condition)}
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
            {state.updateVehicleChecklistError?.steering_wheel_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.steering_wheel_condition[0]}
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
              value={getSafeSelectValue(formValues.battery_condition)}
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
            {state.updateVehicleChecklistError?.battery_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.battery_condition[0]}
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
              value={getSafeSelectValue(formValues.driver_license_valid, true)}
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
            {state.updateVehicleChecklistError?.driver_license_valid && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.driver_license_valid[0]}
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
              value={getSafeSelectValue(
                formValues.vehicle_documents_valid,
                true,
              )}
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
            {state.updateVehicleChecklistError?.vehicle_documents_valid && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.vehicle_documents_valid[0]}
              </p>
            )}
          </div>

          {/* Insurance Valid */}
          <div className="space-y-2">
            <Label htmlFor="insurance_valid">Seguro Válido *</Label>
            <Select
              name="insurance_valid"
              disabled={pending}
              value={getSafeSelectValue(formValues.insurance_valid, true)}
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
            {state.updateVehicleChecklistError?.insurance_valid && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.insurance_valid[0]}
              </p>
            )}
          </div>

          {/* Fire Extinguisher Valid */}
          <div className="space-y-2">
            <Label htmlFor="fire_extinguisher_valid">Extintor Válido *</Label>
            <Select
              name="fire_extinguisher_valid"
              disabled={pending}
              value={getSafeSelectValue(
                formValues.fire_extinguisher_valid,
                true,
              )}
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
            {state.updateVehicleChecklistError?.fire_extinguisher_valid && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.fire_extinguisher_valid[0]}
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
              value={getSafeSelectValue(
                formValues.warning_triangle_present,
                true,
              )}
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
            {state.updateVehicleChecklistError?.warning_triangle_present && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.warning_triangle_present[0]}
              </p>
            )}
          </div>

          {/* Jack Present */}
          <div className="space-y-2">
            <Label htmlFor="jack_present">Macaco Presente *</Label>
            <Select
              name="jack_present"
              disabled={pending}
              value={getSafeSelectValue(formValues.jack_present, true)}
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
            {state.updateVehicleChecklistError?.jack_present && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.jack_present[0]}
              </p>
            )}
          </div>

          {/* Spare Tire Condition */}
          <div className="space-y-2">
            <Label htmlFor="spare_tire_condition">Condição do Estepe *</Label>
            <Select
              name="spare_tire_condition"
              disabled={pending}
              value={getSafeSelectValue(formValues.spare_tire_condition)}
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
            {state.updateVehicleChecklistError?.spare_tire_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.spare_tire_condition[0]}
              </p>
            )}
          </div>
          {renderPhotoSection("spare_tire_condition", "Foto do Estepe")}

          {/* Overall Condition */}
          <div className="space-y-2">
            <Label htmlFor="overall_condition">Condição Geral *</Label>
            <Select
              name="overall_condition"
              disabled={pending}
              value={getSafeSelectValue(formValues.overall_condition)}
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
                  Aprovado com Restrições
                </SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            {state.updateVehicleChecklistError?.overall_condition && (
              <p className="text-sm text-red-500">
                {state.updateVehicleChecklistError.overall_condition[0]}
              </p>
            )}
          </div>

          {/* Notes */}
          <FormInput
            label="Observações (opcional)"
            htmlfor="notes"
            name="notes"
            type="textarea"
            placeholder="Adicione observações sobre o checklist..."
            errorName={state.updateVehicleChecklistError?.notes}
            disabled={pending}
            value={formValues.notes || ""}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6 gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button
            type="submit"
            disabled={pending || !hasAnyChange || isLoadingVehicle}
          >
            {pending ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              "Atualizar Checklist"
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export { UpdateChecklistContainer };
