import { useFormStatus } from "react-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

import { formatMileage } from "@/lib/format-values";
import FormInput from "@/components/custom/form-input";

import { DatePickerField, SelectField } from "../../../../custom";
import { useFetchVehicleData } from "../../../../search-vehicle-by-id-business";

import { PhotoUpload } from "../components/photo-upload";
import {
  getPhotoRequirements,
  validateChecklistForm,
} from "../utils/photo-requirements";

import { CreateVehicleChecklistFormSubmitProps } from "../dto";

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
  { value: "approved_with_restrictions", label: "Aprovado com restrições" },
  { value: "rejected", label: "Reprovado" },
];

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
  initialFormValues,
  onFormValuesChange,
}: CreateVehicleChecklistFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, any>>(() =>
    Object.keys(initialFormValues).length > 0
      ? initialFormValues
      : { checklist_date: new Date().toISOString() },
  );

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

  // Handle boolean field changes (converts "true"/"false" strings to boolean)
  const handleBooleanFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value === "true" }));
  };

  const [displayMileage, setDisplayMileage] = useState<string>(
    () => (initialFormValues._displayMileage as string) || "",
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
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Soma de todas as fotos do checklist
              </p>
            </div>
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
            label="Data do Checklist *"
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
          <SelectField
            label="Condição dos Pneus *"
            htmlfor="tires_condition"
            name="tires_condition"
            value={formValues.tires_condition || ""}
            onChange={(value) => handleFieldChange("tires_condition", value)}
            errorName={state.createVehicleChecklistError?.tires_condition}
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
            value={formValues.fuel_level_adequate?.toString() || ""}
            onChange={handleBooleanFieldChange("fuel_level_adequate")}
            errorName={state.createVehicleChecklistError?.fuel_level_adequate}
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
            value={formValues.headlights_working?.toString() || ""}
            onChange={handleBooleanFieldChange("headlights_working")}
            errorName={state.createVehicleChecklistError?.headlights_working}
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
            value={formValues.taillights_working?.toString() || ""}
            onChange={handleBooleanFieldChange("taillights_working")}
            errorName={state.createVehicleChecklistError?.taillights_working}
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
            value={formValues.turn_signals_working?.toString() || ""}
            onChange={handleBooleanFieldChange("turn_signals_working")}
            errorName={state.createVehicleChecklistError?.turn_signals_working}
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
            value={formValues.bumpers_condition || ""}
            onChange={(value) => handleFieldChange("bumpers_condition", value)}
            errorName={state.createVehicleChecklistError?.bumpers_condition}
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
            value={formValues.windshield_condition || ""}
            onChange={(value) =>
              handleFieldChange("windshield_condition", value)
            }
            errorName={state.createVehicleChecklistError?.windshield_condition}
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
            value={formValues.mirrors_condition || ""}
            onChange={(value) => handleFieldChange("mirrors_condition", value)}
            errorName={state.createVehicleChecklistError?.mirrors_condition}
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
            value={formValues.seatbelts_working?.toString() || ""}
            onChange={handleBooleanFieldChange("seatbelts_working")}
            errorName={state.createVehicleChecklistError?.seatbelts_working}
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
            value={formValues.dashboard_working?.toString() || ""}
            onChange={handleBooleanFieldChange("dashboard_working")}
            errorName={state.createVehicleChecklistError?.dashboard_working}
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
            value={formValues.brakes_working?.toString() || ""}
            onChange={handleBooleanFieldChange("brakes_working")}
            errorName={state.createVehicleChecklistError?.brakes_working}
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
            value={formValues.clutch_working?.toString() || ""}
            onChange={handleBooleanFieldChange("clutch_working")}
            errorName={state.createVehicleChecklistError?.clutch_working}
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
            value={formValues.oil_level_adequate?.toString() || ""}
            onChange={handleBooleanFieldChange("oil_level_adequate")}
            errorName={state.createVehicleChecklistError?.oil_level_adequate}
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
            value={formValues.radiator_water_adequate?.toString() || ""}
            onChange={handleBooleanFieldChange("radiator_water_adequate")}
            errorName={
              state.createVehicleChecklistError?.radiator_water_adequate
            }
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
            value={formValues.brake_fluid_adequate?.toString() || ""}
            onChange={handleBooleanFieldChange("brake_fluid_adequate")}
            errorName={state.createVehicleChecklistError?.brake_fluid_adequate}
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
            value={formValues.steering_wheel_condition || ""}
            onChange={(value) =>
              handleFieldChange("steering_wheel_condition", value)
            }
            errorName={
              state.createVehicleChecklistError?.steering_wheel_condition
            }
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
            value={formValues.battery_condition || ""}
            onChange={(value) => handleFieldChange("battery_condition", value)}
            errorName={state.createVehicleChecklistError?.battery_condition}
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
            value={formValues.driver_license_valid?.toString() || ""}
            onChange={handleBooleanFieldChange("driver_license_valid")}
            errorName={state.createVehicleChecklistError?.driver_license_valid}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Vehicle Documents Valid */}
          <SelectField
            label="Documentos do Veículo Válidos *"
            htmlfor="vehicle_documents_valid"
            name="vehicle_documents_valid"
            value={formValues.vehicle_documents_valid?.toString() || ""}
            onChange={handleBooleanFieldChange("vehicle_documents_valid")}
            errorName={
              state.createVehicleChecklistError?.vehicle_documents_valid
            }
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Insurance Valid */}
          <SelectField
            label="Seguro Válido *"
            htmlfor="insurance_valid"
            name="insurance_valid"
            value={formValues.insurance_valid?.toString() || ""}
            onChange={handleBooleanFieldChange("insurance_valid")}
            errorName={state.createVehicleChecklistError?.insurance_valid}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Fire Extinguisher Valid */}
          <SelectField
            label="Extintor Válido *"
            htmlfor="fire_extinguisher_valid"
            name="fire_extinguisher_valid"
            value={formValues.fire_extinguisher_valid?.toString() || ""}
            onChange={handleBooleanFieldChange("fire_extinguisher_valid")}
            errorName={
              state.createVehicleChecklistError?.fire_extinguisher_valid
            }
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Warning Triangle Present */}
          <SelectField
            label="Triângulo Presente *"
            htmlfor="warning_triangle_present"
            name="warning_triangle_present"
            value={formValues.warning_triangle_present?.toString() || ""}
            onChange={handleBooleanFieldChange("warning_triangle_present")}
            errorName={
              state.createVehicleChecklistError?.warning_triangle_present
            }
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Jack Present */}
          <SelectField
            label="Macaco Presente *"
            htmlfor="jack_present"
            name="jack_present"
            value={formValues.jack_present?.toString() || ""}
            onChange={handleBooleanFieldChange("jack_present")}
            errorName={state.createVehicleChecklistError?.jack_present}
            disabled={pending}
            placeholder="Selecione"
            options={YES_NO_OPTIONS}
          />

          {/* Spare Tire Condition */}
          <SelectField
            label="Condição do Estepe *"
            htmlfor="spare_tire_condition"
            name="spare_tire_condition"
            value={formValues.spare_tire_condition || ""}
            onChange={(value) =>
              handleFieldChange("spare_tire_condition", value)
            }
            errorName={state.createVehicleChecklistError?.spare_tire_condition}
            disabled={pending}
            placeholder="Selecione a condição"
            options={CONDITION_OPTIONS}
          />
          {renderPhotoSection("spare_tire_condition", "Foto do Estepe")}

          {/* Overall Condition */}
          <SelectField
            label="Condição Geral do Veículo *"
            htmlfor="overall_condition"
            name="overall_condition"
            value={formValues.overall_condition || ""}
            onChange={(value) => handleFieldChange("overall_condition", value)}
            errorName={state.createVehicleChecklistError?.overall_condition}
            disabled={pending}
            placeholder="Selecione a condição geral"
            options={OVERALL_CONDITION_OPTIONS}
          />

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
            value={formValues.notes || ""}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
          />
        </div>
      </div>

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
