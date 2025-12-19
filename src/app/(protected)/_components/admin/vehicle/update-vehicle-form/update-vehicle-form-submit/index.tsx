import { useState, useEffect, useRef } from "react";

import { useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";

import FormInput from "@/components/custom/form-input";
import { formatNumericInput } from "@/lib/format-values";

import { DatePickerField, SelectField } from "../../../../custom";
import { UpdateVehicleFormSubmitProps } from "../dto";

const UpdateVehicleFormSubmit = ({
  state,
  onBack,
  vehicleData,
  isBusinessAndBranchDirty,
  isUpdateVehicleOpen,
}: UpdateVehicleFormSubmitProps): JSX.Element => {
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

export { UpdateVehicleFormSubmit };
