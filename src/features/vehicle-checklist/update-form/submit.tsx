import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { useFormStatus } from "react-dom";

import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFormFooter } from "@/components/ui/dialog";
import FormInput from "@/components/shared/custom/form-input";

import { formatMileage } from "@/lib/format-values";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { updateVehicleChecklistFormSchema } from "@/schemas/create-update-vehicle-checklist-schema";
import { CHECKLIST_ANSWER_FIELDS } from "../lib/live-rules";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";
import { OVERALL_CONDITION_OPTIONS } from "../lib/condition-options";

import {
  checklistEditOriginalValues,
  isChecklistEditDirty,
} from "../lib/edit-form";

import type { UpdateVehicleChecklistFormSubmitProps } from "./types";
import { getPhotoRequirements } from "../photo-requirements";

import { UploadProgress } from "@/components/shared/upload-progress";
import { PhotoFieldLoading } from "@/components/shared/custom/photo-field-loading";

// Its own chunk (react-dropzone): loaded with this dialog, not with the page.
const PhotoUpload = dynamic(
  () => import("./photo-upload").then((module) => module.PhotoUpload),
  { ssr: false, loading: PhotoFieldLoading },
);

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

const UpdateChecklistFormSubmit = ({
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
  uploadProgress,
  uploadError,
}: UpdateVehicleChecklistFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Fetch current vehicle data for validation
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || checklistData.vehicleId,
    businessId: checklistData.businessId as string,
  });

  // What the form opened on, for the dirty check (lib/edit-form).
  const originalFormValues = useMemo(
    () => (checklistData ? checklistEditOriginalValues(checklistData) : {}),
    [checklistData?.id],
  );

  const [formValues, setFormValues] = useState<Record<string, any>>(() =>
    Object.keys(initialFormValues).length > 0
      ? initialFormValues
      : originalFormValues,
  );

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  // The date compares the day, not the UTC date of the strings (lib/edit-form).
  const isDirty = checklistData
    ? isChecklistEditDirty(originalFormValues, formValues)
    : false;

  // Live validation (decision 16.700). No mileage rule against the vehicle
  // here: the stored date is a past moment, and only the API knows the
  // readings around it (lib/mileage-rule).
  const live = useLiveValidation({
    schema: updateVehicleChecklistFormSchema,
    values: formValues,
    fields: CHECKLIST_ANSWER_FIELDS,
    serverErrors: state.updateVehicleChecklistError,
  });

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

  // Handle boolean field changes (converts "true"/"false" strings to boolean)
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
    // Empty is "missing" (the schema's required message), not zero.
    handleFieldChange(
      "current_mileage",
      numbersOnly ? parseInt(numbersOnly, 10) : undefined,
    );
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
    <div ref={live.ref}>
      <div className="space-y-4 mt-5">
        {/* Selected Items Summary */}
        <div
          className="bg-white rounded-lg p-4 mb-6 border
          border-gray-200 dark:bg-gray-800 dark:border-gray-700"
        >
          <h3
            className="font-bold text-foreground
            dark:text-gray-100 mb-3"
          >
            📋 Resumo da Seleção
          </h3>
          <div className="space-y-3">
            <div className="flex">
              <span
                className="text-sm text-muted-foreground
                dark:text-gray-400"
              >
                Filial:
              </span>
              <span
                className="text-sm text-foreground
                dark:text-gray-100 flex-1 font-medium ml-2"
              >
                {commandBranchInputValue?.searchBranchInputValue ||
                  checklistData.branch?.corporate_reason ||
                  ""}
              </span>
            </div>
            <div className="flex">
              <span
                className="text-sm text-muted-foreground
                dark:text-gray-400"
              >
                Veículo:
              </span>
              <span
                className="text-sm text-foreground
                dark:text-gray-100 flex-1 font-medium ml-2"
              >
                {commandVehicleInputValue?.searchVehicleInputValue ||
                  checklistData.vehicle?.description ||
                  ""}
                {(commandVehicleInputValue?.vehicleLicensePlate ||
                  checklistData.vehicle?.license_plate) && (
                  <span className="text-xs text-muted-foreground ml-2">
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
                className="text-sm text-muted-foreground
                dark:text-gray-400"
              >
                Motorista:
              </span>
              <span
                className="text-sm text-foreground
                dark:text-gray-100 flex-1 font-medium ml-2"
              >
                {commandDriverInputValue?.searchDriverInputValue ||
                  checklistData.driver?.name ||
                  ""}
                {(commandDriverInputValue?.driverCnh ||
                  checklistData.driver?.cnh) && (
                  <span className="text-xs text-muted-foreground ml-2">
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
              className="text-sm text-muted-foreground
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
              Quilometragem atual:{" "}
              {data.current_mileage.toLocaleString("pt-BR")} km
              <br />
              Intervalo de manutenção:{" "}
              {data.maintenance_interval_km.toLocaleString("pt-BR")} km
              {data.last_maintenance_mileage && (
                <>
                  <br />
                  Última manutenção:{" "}
                  {data.last_maintenance_mileage.toLocaleString("pt-BR")} km
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
            errorName={live.errorOf("checklist_date")}
            disabled={pending}
          />

          {/* Current Mileage */}
          <FormInput
            label="Quilometragem Atual (km) *"
            htmlfor="current_mileage"
            name="current_mileage"
            type="text"
            placeholder="Ex: 50.000"
            errorName={live.errorOf("current_mileage")}
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
            onChange={(value) => handleFieldChange("tires_condition", value)}
            errorName={live.errorOf("tires_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
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
            errorName={live.errorOf("fuel_level_adequate")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            errorName={live.errorOf("headlights_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            errorName={live.errorOf("taillights_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            errorName={live.errorOf("turn_signals_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Turn Signals Photos */}
          {renderPhotoSection("turn_signals_working", "Foto das Setas")}

          {/* Bumpers Condition */}
          <SelectField
            label="Condição dos Para-choques *"
            htmlfor="bumpers_condition"
            name="bumpers_condition"
            value={getSafeSelectValue(formValues.bumpers_condition)}
            onChange={(value) => handleFieldChange("bumpers_condition", value)}
            errorName={live.errorOf("bumpers_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("bumpers_condition", "Foto dos Para-choques")}

          {/* Windshield Condition */}
          <SelectField
            label="Condição do Para-brisa *"
            htmlfor="windshield_condition"
            name="windshield_condition"
            value={getSafeSelectValue(formValues.windshield_condition)}
            onChange={(value) =>
              handleFieldChange("windshield_condition", value)
            }
            errorName={live.errorOf("windshield_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("windshield_condition", "Foto do Para-brisa")}

          {/* Mirrors Condition */}
          <SelectField
            label="Condição dos Retrovisores *"
            htmlfor="mirrors_condition"
            name="mirrors_condition"
            value={getSafeSelectValue(formValues.mirrors_condition)}
            onChange={(value) => handleFieldChange("mirrors_condition", value)}
            errorName={live.errorOf("mirrors_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("mirrors_condition", "Foto dos Retrovisores")}

          {/* Seatbelts Working */}
          <SelectField
            label="Cintos de Segurança Funcionando *"
            htmlfor="seatbelts_working"
            name="seatbelts_working"
            value={getSafeSelectValue(formValues.seatbelts_working, true)}
            onChange={handleBooleanFieldChange("seatbelts_working")}
            errorName={live.errorOf("seatbelts_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            errorName={live.errorOf("dashboard_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />
          {renderPhotoSection("dashboard_working", "Foto do Painel")}

          {/* Brakes */}
          <SelectField
            label="Freios Funcionando *"
            htmlfor="brakes_working"
            name="brakes_working"
            value={getSafeSelectValue(formValues.brakes_working, true)}
            onChange={handleBooleanFieldChange("brakes_working")}
            errorName={live.errorOf("brakes_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />
          {renderPhotoSection("brakes_working", "Foto dos Freios")}

          {/* Clutch Working */}
          <SelectField
            label="Embreagem Funcionando *"
            htmlfor="clutch_working"
            name="clutch_working"
            value={getSafeSelectValue(formValues.clutch_working, true)}
            onChange={handleBooleanFieldChange("clutch_working")}
            errorName={live.errorOf("clutch_working")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />
          {renderPhotoSection("clutch_working", "Foto da Embreagem")}

          {/* Oil Level Adequate */}
          <SelectField
            label="Nível de Óleo Adequado *"
            htmlfor="oil_level_adequate"
            name="oil_level_adequate"
            value={getSafeSelectValue(formValues.oil_level_adequate, true)}
            onChange={handleBooleanFieldChange("oil_level_adequate")}
            errorName={live.errorOf("oil_level_adequate")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />
          {renderPhotoSection("oil_level_adequate", "Foto do Nível de Óleo")}

          {/* Radiator Water Adequate */}
          <SelectField
            label="Água do Radiador Adequada *"
            htmlfor="radiator_water_adequate"
            name="radiator_water_adequate"
            value={getSafeSelectValue(formValues.radiator_water_adequate, true)}
            onChange={handleBooleanFieldChange("radiator_water_adequate")}
            errorName={live.errorOf("radiator_water_adequate")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            errorName={live.errorOf("brake_fluid_adequate")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            onChange={(value) =>
              handleFieldChange("steering_wheel_condition", value)
            }
            errorName={live.errorOf("steering_wheel_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("steering_wheel_condition", "Foto do Volante")}

          {/* Battery Condition */}
          <SelectField
            label="Condição da Bateria *"
            htmlfor="battery_condition"
            name="battery_condition"
            value={getSafeSelectValue(formValues.battery_condition)}
            onChange={(value) => handleFieldChange("battery_condition", value)}
            errorName={live.errorOf("battery_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("battery_condition", "Foto da Bateria")}

          {/* Driver License Valid */}
          <SelectField
            label="CNH Válida *"
            htmlfor="driver_license_valid"
            name="driver_license_valid"
            value={getSafeSelectValue(formValues.driver_license_valid, true)}
            onChange={handleBooleanFieldChange("driver_license_valid")}
            errorName={live.errorOf("driver_license_valid")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Vehicle Documents Valid */}
          <SelectField
            label="Documentos do Veículo Válidos *"
            htmlfor="vehicle_documents_valid"
            name="vehicle_documents_valid"
            value={getSafeSelectValue(formValues.vehicle_documents_valid, true)}
            onChange={handleBooleanFieldChange("vehicle_documents_valid")}
            errorName={live.errorOf("vehicle_documents_valid")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Insurance Valid */}
          <SelectField
            label="Seguro Válido *"
            htmlfor="insurance_valid"
            name="insurance_valid"
            value={getSafeSelectValue(formValues.insurance_valid, true)}
            onChange={handleBooleanFieldChange("insurance_valid")}
            errorName={live.errorOf("insurance_valid")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Fire Extinguisher Valid */}
          <SelectField
            label="Extintor Válido *"
            htmlfor="fire_extinguisher_valid"
            name="fire_extinguisher_valid"
            value={getSafeSelectValue(formValues.fire_extinguisher_valid, true)}
            onChange={handleBooleanFieldChange("fire_extinguisher_valid")}
            errorName={live.errorOf("fire_extinguisher_valid")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
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
            errorName={live.errorOf("warning_triangle_present")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Jack Present */}
          <SelectField
            label="Macaco Presente *"
            htmlfor="jack_present"
            name="jack_present"
            value={getSafeSelectValue(formValues.jack_present, true)}
            onChange={handleBooleanFieldChange("jack_present")}
            errorName={live.errorOf("jack_present")}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Spare Tire Condition */}
          <SelectField
            label="Condição do Estepe *"
            htmlfor="spare_tire_condition"
            name="spare_tire_condition"
            value={getSafeSelectValue(formValues.spare_tire_condition)}
            onChange={(value) =>
              handleFieldChange("spare_tire_condition", value)
            }
            errorName={live.errorOf("spare_tire_condition")}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("spare_tire_condition", "Foto do Estepe")}

          {/* Overall Condition */}
          <SelectField
            label="Condição Geral *"
            htmlfor="overall_condition"
            name="overall_condition"
            value={getSafeSelectValue(formValues.overall_condition)}
            onChange={(value) => handleFieldChange("overall_condition", value)}
            errorName={live.errorOf("overall_condition")}
            disabled={pending}
            placeholder="Selecione a condição geral"
            options={OVERALL_CONDITION_OPTIONS}
          />

          {/* Notes */}
          <FormInput
            label="Observações (opcional)"
            htmlfor="notes"
            name="notes"
            type="textarea"
            placeholder="Adicione observações sobre o checklist..."
            errorName={live.errorOf("notes")}
            disabled={pending}
            value={formValues.notes || ""}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="mt-6">
          <UploadProgress progress={uploadProgress} error={uploadError} />
        </div>

        {/* The dialog's width picks the layout (decision 3.2); saving stays
            off until something changed (decision 2.5). */}
        <DialogFormFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={pending || isLoadingVehicle}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Voltar
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              !canSubmitForm({ isEdit: true, isDirty: hasAnyChange }) ||
              isLoadingVehicle
            }
          >
            {pending ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </DialogFormFooter>
      </div>
    </div>
  );
};

export { UpdateChecklistFormSubmit };
