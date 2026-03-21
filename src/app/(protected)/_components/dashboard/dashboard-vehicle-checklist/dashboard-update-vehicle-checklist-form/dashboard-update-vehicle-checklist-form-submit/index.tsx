import { useState, useMemo } from "react";
import { useFormStatus } from "react-dom";

import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { formatMileage } from "@/lib/format-values";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import type { DashboardUpdateVehicleChecklistFormSubmitProps } from "../dashboard-update-vehicle-checklist-form.types";
import { getPhotoRequirements } from "../../dashboard-create-vehicle-checklist-form/utils/photo-requirements";

import { PhotoUpload } from "../photo-upload";
import { useAuthStore } from "@/store/auth-store";

// Reusable select options
const CONDITION_OPTIONS = [
  { value: "good", label: "Bom" },
  { value: "bad", label: "Ruim" },
  { value: "needs_attention", label: "Precisa de atenção" },
];

const YES_NO_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

const OVERALL_CONDITION_OPTIONS = [
  { value: "approved", label: "Aprovado" },
  { value: "approved_with_restrictions", label: "Aprovado com Restrições" },
  { value: "rejected", label: "Rejeitado" },
];

const DashboardUpdateChecklistFormSubmit = ({
  state,
  onBack,
  checklistData,
  isEntityDirty,
  initialFormValues,
  onFormValuesChange,
  commandBranchInputValue,
  commandVehicleInputValue,
  commandDriverInputValue,
  checklistFiles,
  setChecklistFiles,
  fileErrors,
  setFileErrors,
  photosToRemove,
  setPhotosToRemove,
}: DashboardUpdateVehicleChecklistFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

  // Fetch current vehicle data for validation
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || checklistData.vehicleId,
    businessId: businessId as string,
  });

  // Original form values from checklist data for dirty comparison
  const originalFormValues = useMemo(() => {
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
      notes: checklistData.notes || "",
    };
  }, [checklistData?.id]); // Only depend on stable ID

  const [formValues, setFormValues] = useState<Record<string, any>>(() =>
    Object.keys(initialFormValues).length > 0
      ? initialFormValues
      : originalFormValues,
  );

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Computed isDirty - checks if any field has changed from original values
  const isDirty = Object.keys(formValues).some((key) => {
    const currentValue = formValues[key];
    const originalValue = (originalFormValues as Record<string, any>)[key];

    if (!checklistData || originalValue === undefined) return false;

    if (
      typeof currentValue === "boolean" &&
      typeof originalValue === "boolean"
    ) {
      return currentValue !== originalValue;
    }

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

    if (key === "checklist_date") {
      const currentDate = currentValue?.toString() || "";
      const originalDate = originalValue?.toString() || "";

      if (!currentDate && !originalDate) return false;
      if (!currentDate || !originalDate) return true;

      try {
        const currentDateOnly = currentDate.split("T")[0];
        const originalDateOnly = originalDate.split("T")[0];
        return currentDateOnly !== originalDateOnly;
      } catch {
        return currentDate !== originalDate;
      }
    }

    const currentStr = currentValue?.toString() || "";
    const originalStr = originalValue?.toString() || "";

    return currentStr !== originalStr;
  });

  // Helper function to get safe value for selects (prevents undefined/null issues)
  const getSafeSelectValue = (value: any, isBoolean = false): string => {
    if (isBoolean) {
      return value !== undefined && value !== null ? String(value) : "";
    }

    return value || "";
  };

  // Function to handle changes in custom fields (datepicker and select)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value);
  };

  // Handler para campos booleanos (converte string "true"/"false" para boolean)
  const handleBooleanFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value === "true");
  };

  const [displayMileage, setDisplayMileage] = useState<string>(
    () =>
      (initialFormValues._displayMileage as string) ||
      (checklistData.current_mileage
        ? formatMileage(checklistData.current_mileage.toString())
        : ""),
  );

  const handleBack = () => {
    onFormValuesChange({
      ...formValues,
      _displayMileage: displayMileage,
    });
    onBack();
  };

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
    isDirty || isEntityDirty || hasFileChange || hasPhotoRemoval;

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
                  checklistData.branch?.corporate_reason ||
                  ""}
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
                  checklistData.vehicle?.description ||
                  ""}
                {(commandVehicleInputValue?.vehicleLicensePlate ||
                  checklistData.vehicle?.license_plate) && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Placa:{" "}
                    {commandVehicleInputValue.vehicleLicensePlate ||
                      checklistData.vehicle?.license_plate}
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
                  checklistData.driver?.name ||
                  ""}
                {(commandDriverInputValue?.driverCnh ||
                  checklistData.driver?.cnh) && (
                  <span className="text-xs text-gray-500 ml-2">
                    (CNH:{" "}
                    {commandDriverInputValue.driverCnh ||
                      checklistData.driver?.cnh}
                    )
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

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
            <div
              className="mt-3 pt-3 border-t
              border-blue-300 dark:border-blue-700"
            >
              <p
                className="text-sm font-semibold text-blue-900
                dark:text-blue-100 flex items-center gap-2"
              >
                📸 Limite de upload total:
                <span
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900
                  text-blue-700 dark:text-blue-200 rounded-md font-bold"
                >
                  5MB
                </span>
              </p>
              <p
                className="text-xs text-blue-700
                dark:text-blue-300 mt-1"
              >
                Soma de todas as fotos do checklist
              </p>
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

        {/* Form Fields - Linear Layout like Create */}
        <div className="space-y-4">
          {/* Date */}
          <DatePickerField
            label="Data do Checklist *"
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
          <SelectField
            label="Condição dos Pneus *"
            htmlfor="tires_condition"
            name="tires_condition"
            value={getSafeSelectValue(formValues.tires_condition)}
            onChange={handleCustomFieldChange("tires_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={state.updateVehicleChecklistError?.tires_condition}
            disabled={pending}
          />

          {/* Tires Photos - Always Required */}
          {renderPhotoSection("tires_condition", "Foto dos Pneus")}

          {/* Fuel Level */}
          <SelectField
            label="Nível de Combustível Adequado *"
            htmlfor="fuel_level_adequate"
            name="fuel_level_adequate"
            value={getSafeSelectValue(formValues.fuel_level_adequate, true)}
            onChange={handleBooleanFieldChange("fuel_level_adequate")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.fuel_level_adequate}
            disabled={pending}
          />

          {/* Fuel Level Photos - Always Required */}
          {renderPhotoSection(
            "fuel_level_adequate",
            "Foto do Nível de Combustível",
          )}

          {/* Headlights */}
          <SelectField
            label="Faróis Funcionando *"
            htmlfor="headlights_working"
            name="headlights_working"
            value={getSafeSelectValue(formValues.headlights_working, true)}
            onChange={handleBooleanFieldChange("headlights_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.headlights_working}
            disabled={pending}
          />

          {/* Headlights Photos - Required if not OK */}
          {renderPhotoSection("headlights_working", "Foto dos Faróis")}

          {/* Taillights */}
          <SelectField
            label="Lanternas Traseiras Funcionando *"
            htmlfor="taillights_working"
            name="taillights_working"
            value={getSafeSelectValue(formValues.taillights_working, true)}
            onChange={handleBooleanFieldChange("taillights_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.taillights_working}
            disabled={pending}
          />

          {/* Taillights Photos */}
          {renderPhotoSection(
            "taillights_working",
            "Foto das Lanternas Traseiras",
          )}

          {/* Turn Signals */}
          <SelectField
            label="Setas Funcionando *"
            htmlfor="turn_signals_working"
            name="turn_signals_working"
            value={getSafeSelectValue(formValues.turn_signals_working, true)}
            onChange={handleBooleanFieldChange("turn_signals_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.turn_signals_working}
            disabled={pending}
          />

          {/* Turn Signals Photos */}
          {renderPhotoSection("turn_signals_working", "Foto das Setas")}

          {/* Bumpers Condition */}
          <SelectField
            label="Condição dos Para-choques *"
            htmlfor="bumpers_condition"
            name="bumpers_condition"
            value={getSafeSelectValue(formValues.bumpers_condition)}
            onChange={handleCustomFieldChange("bumpers_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={state.updateVehicleChecklistError?.bumpers_condition}
            disabled={pending}
          />
          {renderPhotoSection("bumpers_condition", "Foto dos Para-choques")}

          {/* Windshield Condition */}
          <SelectField
            label="Condição do Para-brisa *"
            htmlfor="windshield_condition"
            name="windshield_condition"
            value={getSafeSelectValue(formValues.windshield_condition)}
            onChange={handleCustomFieldChange("windshield_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={state.updateVehicleChecklistError?.windshield_condition}
            disabled={pending}
          />
          {renderPhotoSection("windshield_condition", "Foto do Para-brisa")}

          {/* Mirrors Condition */}
          <SelectField
            label="Condição dos Retrovisores *"
            htmlfor="mirrors_condition"
            name="mirrors_condition"
            value={getSafeSelectValue(formValues.mirrors_condition)}
            onChange={handleCustomFieldChange("mirrors_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={state.updateVehicleChecklistError?.mirrors_condition}
            disabled={pending}
          />
          {renderPhotoSection("mirrors_condition", "Foto dos Retrovisores")}

          {/* Seatbelts Working */}
          <SelectField
            label="Cintos de Segurança Funcionando *"
            htmlfor="seatbelts_working"
            name="seatbelts_working"
            value={getSafeSelectValue(formValues.seatbelts_working, true)}
            onChange={handleBooleanFieldChange("seatbelts_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.seatbelts_working}
            disabled={pending}
          />
          {renderPhotoSection(
            "seatbelts_working",
            "Foto dos Cintos de Segurança",
          )}

          {/* Dashboard Working */}
          <SelectField
            label="Painel Funcionando *"
            htmlfor="dashboard_working"
            name="dashboard_working"
            value={getSafeSelectValue(formValues.dashboard_working, true)}
            onChange={handleBooleanFieldChange("dashboard_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.dashboard_working}
            disabled={pending}
          />
          {renderPhotoSection("dashboard_working", "Foto do Painel")}

          {/* Brakes */}
          <SelectField
            label="Freios Funcionando *"
            htmlfor="brakes_working"
            name="brakes_working"
            value={getSafeSelectValue(formValues.brakes_working, true)}
            onChange={handleBooleanFieldChange("brakes_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.brakes_working}
            disabled={pending}
          />
          {renderPhotoSection("brakes_working", "Foto dos Freios")}

          {/* Clutch Working */}
          <SelectField
            label="Embreagem Funcionando *"
            htmlfor="clutch_working"
            name="clutch_working"
            value={getSafeSelectValue(formValues.clutch_working, true)}
            onChange={handleBooleanFieldChange("clutch_working")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.clutch_working}
            disabled={pending}
          />
          {renderPhotoSection("clutch_working", "Foto da Embreagem")}

          {/* Oil Level Adequate */}
          <SelectField
            label="Nível de Óleo Adequado *"
            htmlfor="oil_level_adequate"
            name="oil_level_adequate"
            value={getSafeSelectValue(formValues.oil_level_adequate, true)}
            onChange={handleBooleanFieldChange("oil_level_adequate")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.oil_level_adequate}
            disabled={pending}
          />
          {renderPhotoSection("oil_level_adequate", "Foto do Nível de Óleo")}

          {/* Radiator Water Adequate */}
          <SelectField
            label="Água do Radiador Adequada *"
            htmlfor="radiator_water_adequate"
            name="radiator_water_adequate"
            value={getSafeSelectValue(formValues.radiator_water_adequate, true)}
            onChange={handleBooleanFieldChange("radiator_water_adequate")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={
              state.updateVehicleChecklistError?.radiator_water_adequate
            }
            disabled={pending}
          />
          {renderPhotoSection(
            "radiator_water_adequate",
            "Foto da Água do Radiador",
          )}

          {/* Brake Fluid Adequate */}
          <SelectField
            label="Fluido de Freio Adequado *"
            htmlfor="brake_fluid_adequate"
            name="brake_fluid_adequate"
            value={getSafeSelectValue(formValues.brake_fluid_adequate, true)}
            onChange={handleBooleanFieldChange("brake_fluid_adequate")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.brake_fluid_adequate}
            disabled={pending}
          />
          {renderPhotoSection(
            "brake_fluid_adequate",
            "Foto do Fluido de Freio",
          )}

          {/* Steering Wheel Condition */}
          <SelectField
            label="Condição do Volante *"
            htmlfor="steering_wheel_condition"
            name="steering_wheel_condition"
            value={getSafeSelectValue(formValues.steering_wheel_condition)}
            onChange={handleCustomFieldChange("steering_wheel_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={
              state.updateVehicleChecklistError?.steering_wheel_condition
            }
            disabled={pending}
          />
          {renderPhotoSection("steering_wheel_condition", "Foto do Volante")}

          {/* Battery Condition */}
          <SelectField
            label="Condição da Bateria *"
            htmlfor="battery_condition"
            name="battery_condition"
            value={getSafeSelectValue(formValues.battery_condition)}
            onChange={handleCustomFieldChange("battery_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={state.updateVehicleChecklistError?.battery_condition}
            disabled={pending}
          />
          {renderPhotoSection("battery_condition", "Foto da Bateria")}

          {/* Driver License Valid */}
          <SelectField
            label="CNH Válida *"
            htmlfor="driver_license_valid"
            name="driver_license_valid"
            value={getSafeSelectValue(formValues.driver_license_valid, true)}
            onChange={handleBooleanFieldChange("driver_license_valid")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.driver_license_valid}
            disabled={pending}
          />

          {/* Vehicle Documents Valid */}
          <SelectField
            label="Documentos do Veículo Válidos *"
            htmlfor="vehicle_documents_valid"
            name="vehicle_documents_valid"
            value={getSafeSelectValue(formValues.vehicle_documents_valid, true)}
            onChange={handleBooleanFieldChange("vehicle_documents_valid")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={
              state.updateVehicleChecklistError?.vehicle_documents_valid
            }
            disabled={pending}
          />

          {/* Insurance Valid */}
          <SelectField
            label="Seguro Válido *"
            htmlfor="insurance_valid"
            name="insurance_valid"
            value={getSafeSelectValue(formValues.insurance_valid, true)}
            onChange={handleBooleanFieldChange("insurance_valid")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.insurance_valid}
            disabled={pending}
          />

          {/* Fire Extinguisher Valid */}
          <SelectField
            label="Extintor Válido *"
            htmlfor="fire_extinguisher_valid"
            name="fire_extinguisher_valid"
            value={getSafeSelectValue(formValues.fire_extinguisher_valid, true)}
            onChange={handleBooleanFieldChange("fire_extinguisher_valid")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={
              state.updateVehicleChecklistError?.fire_extinguisher_valid
            }
            disabled={pending}
          />

          {/* Warning Triangle Present */}
          <SelectField
            label="Triângulo Presente *"
            htmlfor="warning_triangle_present"
            name="warning_triangle_present"
            value={getSafeSelectValue(
              formValues.warning_triangle_present,
              true,
            )}
            onChange={handleBooleanFieldChange("warning_triangle_present")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={
              state.updateVehicleChecklistError?.warning_triangle_present
            }
            disabled={pending}
          />

          {/* Jack Present */}
          <SelectField
            label="Macaco Presente *"
            htmlfor="jack_present"
            name="jack_present"
            value={getSafeSelectValue(formValues.jack_present, true)}
            onChange={handleBooleanFieldChange("jack_present")}
            options={YES_NO_OPTIONS}
            placeholder="Selecione"
            errorName={state.updateVehicleChecklistError?.jack_present}
            disabled={pending}
          />

          {/* Spare Tire Condition */}
          <SelectField
            label="Condição do Estepe *"
            htmlfor="spare_tire_condition"
            name="spare_tire_condition"
            value={getSafeSelectValue(formValues.spare_tire_condition)}
            onChange={handleCustomFieldChange("spare_tire_condition")}
            options={CONDITION_OPTIONS}
            placeholder="Selecione a condição"
            errorName={state.updateVehicleChecklistError?.spare_tire_condition}
            disabled={pending}
          />
          {renderPhotoSection("spare_tire_condition", "Foto do Estepe")}

          {/* Overall Condition */}
          <SelectField
            label="Condição Geral *"
            htmlfor="overall_condition"
            name="overall_condition"
            value={getSafeSelectValue(formValues.overall_condition)}
            onChange={handleCustomFieldChange("overall_condition")}
            options={OVERALL_CONDITION_OPTIONS}
            placeholder="Selecione a condição geral"
            errorName={state.updateVehicleChecklistError?.overall_condition}
            disabled={pending}
          />

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
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={pending || isLoadingVehicle}
          >
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
              "Editar Checklist"
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export { DashboardUpdateChecklistFormSubmit };
