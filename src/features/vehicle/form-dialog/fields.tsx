"use client";

import FormInput from "@/components/shared/custom/form-input";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { formatNumericInput } from "@/lib/format-values";
import { vehicleStatusOptions, type VehicleStatus } from "@/lib/vehicle-status";

import {
  yearOptions,
  type VehicleFormField,
  type VehicleFormValues,
} from "../lib/form-values";

type FieldErrors = Partial<Record<string, string[]>>;

interface VehicleFieldsProps {
  values: VehicleFormValues;
  onChange: (field: VehicleFormField, value: string) => void;
  errors?: FieldErrors;
  disabled: boolean;
  /**
   * The status the vehicle HAS (edit) — the options depend on it, never on
   * the value being edited (FLEET-VEH-4). Absent on create.
   */
  persistedStatus?: VehicleStatus;
  /** Only a MASTER corrects the odometer of an existing vehicle. */
  mileageLocked: boolean;
  /**
   * The revision fields (Gestão de Frotas only, `showsMaintenanceFields`).
   * Defaults to shown, the behaviour every caller had.
   */
  withMaintenance?: boolean;
  /** What the locked odometer says moves it (`lockedMileageHint`). */
  mileageHint?: string;
}

/** Mercosul (ABC1D23) or the old format (ABC1234), capitals only. */
function licensePlateMask(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (clean.length <= 3) return clean;

  if (clean.length > 4 && /[A-Z]/.test(clean[4])) {
    return `${clean.slice(0, 3)}${clean.slice(3, 4)}${clean.slice(4, 5)}${clean.slice(5, 7)}`;
  }

  return `${clean.slice(0, 3)}${clean.slice(3, 7)}`;
}

const beforeMaskedValueChange = (newState: { value: string }) => ({
  ...newState,
  value: licensePlateMask(newState.value),
});

/**
 * The typed fields of the vehicle form, for create and edit alike.
 *
 * Years are picked from a list (FLEET-VEH-3): the date picker capped both at
 * today, so a 2026/2027 truck could not be registered, and a year is not a
 * day anyway.
 */
const VehicleFields = ({
  values,
  onChange,
  errors,
  disabled,
  persistedStatus,
  mileageLocked,
  withMaintenance = true,
  mileageHint = "Atualizada pelos abastecimentos, checklists e OS.",
}: VehicleFieldsProps): JSX.Element => {
  const text =
    (field: VehicleFormField) => (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(field, event.target.value);

  const manufacturingYears = yearOptions("manufacturing").map((year) => ({
    value: year,
    label: year,
  }));

  const modelYears = yearOptions("model").map((year) => ({
    value: year,
    label: year,
  }));

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormInput
        label="Descrição do veículo *"
        htmlfor="description"
        name="description"
        type="text"
        placeholder="Ex.: Caminhão baú 01"
        value={values.description}
        onChange={text("description")}
        errorName={errors?.description}
        disabled={disabled}
      />

      <FormInput
        label="Placa do veículo *"
        htmlfor="license_plate"
        name="license_plate"
        placeholder="ABC1234 ou ABC1D23"
        mask="***9*99"
        maskChar={null}
        beforeMaskedValueChange={beforeMaskedValueChange}
        type="text"
        value={values.license_plate}
        onChange={text("license_plate")}
        errorName={errors?.license_plate}
        disabled={disabled}
      />

      <FormInput
        label="Marca *"
        htmlfor="brand"
        name="brand"
        type="text"
        placeholder="Ex.: Volvo"
        value={values.brand}
        onChange={text("brand")}
        errorName={errors?.brand}
        disabled={disabled}
      />

      <FormInput
        label="Modelo *"
        htmlfor="model"
        name="model"
        type="text"
        placeholder="Ex.: FH 540"
        value={values.model}
        onChange={text("model")}
        errorName={errors?.model}
        disabled={disabled}
      />

      <DatePickerField
        label="Data de aquisição *"
        htmlfor="acquisition_date"
        name="acquisition_date"
        value={values.acquisition_date}
        onChange={(value) => onChange("acquisition_date", value)}
        errorName={errors?.acquisition_date}
        disabled={disabled}
      />

      <SelectField
        label="Tipo de frota *"
        htmlfor="fleet_type"
        name="fleet_type"
        value={values.fleet_type}
        onChange={(value) => onChange("fleet_type", value)}
        errorName={errors?.fleet_type}
        disabled={disabled}
        placeholder="Selecione o tipo da frota"
        options={[
          { value: "OWNED", label: "Própria" },
          { value: "THIRD_PARTY", label: "Terceirizada" },
        ]}
      />

      <FormInput
        label="Identificador na frota (opcional)"
        htmlfor="fleet_id"
        name="fleet_id"
        type="text"
        maxLength={50}
        placeholder="Ex.: número interno ou do agregado"
        value={values.fleet_id}
        onChange={text("fleet_id")}
        errorName={errors?.fleet_id}
        disabled={disabled}
      />

      <FormInput
        label="RENAVAM *"
        htmlfor="renavam"
        name="renavam"
        type="text"
        inputMode="numeric"
        maxLength={11}
        placeholder="11 dígitos"
        value={values.renavam}
        onChange={text("renavam")}
        errorName={errors?.renavam}
        disabled={disabled}
      />

      <SelectField
        label="Ano de fabricação *"
        htmlfor="manufacturing_year"
        name="manufacturing_year"
        value={values.manufacturing_year}
        onChange={(value) => onChange("manufacturing_year", value)}
        errorName={errors?.manufacturing_year}
        disabled={disabled}
        placeholder="Selecione o ano"
        options={manufacturingYears}
      />

      <SelectField
        label="Ano do modelo *"
        htmlfor="model_year"
        name="model_year"
        value={values.model_year}
        onChange={(value) => onChange("model_year", value)}
        errorName={errors?.model_year}
        disabled={disabled}
        placeholder="Selecione o ano"
        hint="Igual ao de fabricação ou o do ano seguinte."
        options={modelYears}
      />

      <FormInput
        label="Quilometragem atual *"
        htmlfor="current_mileage"
        name="current_mileage"
        type="number"
        min="0.1"
        max="9999999"
        step="0.1"
        placeholder="Ex.: 120000"
        value={values.current_mileage}
        onChange={text("current_mileage")}
        errorName={errors?.current_mileage}
        disabled={disabled || mileageLocked}
        hint={mileageLocked ? mileageHint : undefined}
        onInput={(event) => formatNumericInput(event, 9999999, true)}
      />

      {withMaintenance && (
        <>
          <FormInput
            label="Quilometragem da última revisão (opcional)"
            htmlfor="last_maintenance_mileage"
            name="last_maintenance_mileage"
            type="number"
            min="0.1"
            max="9999999"
            step="0.1"
            placeholder="Ex.: 110000"
            value={values.last_maintenance_mileage}
            onChange={text("last_maintenance_mileage")}
            errorName={errors?.last_maintenance_mileage}
            disabled={disabled}
            onInput={(event) => formatNumericInput(event, 9999999, true)}
          />

          <DatePickerField
            label="Data da última revisão (opcional)"
            htmlfor="last_maintenance_date"
            name="last_maintenance_date"
            value={values.last_maintenance_date}
            onChange={(value) => onChange("last_maintenance_date", value)}
            errorName={errors?.last_maintenance_date}
            disabled={disabled}
          />

          <FormInput
            label="Revisão a cada (km) *"
            htmlfor="maintenance_interval_km"
            name="maintenance_interval_km"
            type="number"
            min="0.1"
            max="100000"
            step="0.1"
            placeholder="Ex.: 10000"
            value={values.maintenance_interval_km}
            onChange={text("maintenance_interval_km")}
            errorName={errors?.maintenance_interval_km}
            disabled={disabled}
            onInput={(event) => formatNumericInput(event, 100000, true)}
          />

          <FormInput
            label="Revisão a cada (meses) *"
            htmlfor="maintenance_interval_months"
            name="maintenance_interval_months"
            type="number"
            min="1"
            max="60"
            step="1"
            inputMode="numeric"
            placeholder="Ex.: 6"
            value={values.maintenance_interval_months}
            onChange={text("maintenance_interval_months")}
            errorName={errors?.maintenance_interval_months}
            disabled={disabled}
            onInput={(event) => formatNumericInput(event, 60)}
          />
        </>
      )}

      <FormInput
        label="Consumo (km/l) *"
        htmlfor="km_per_liter"
        name="km_per_liter"
        type="number"
        min="0.1"
        max="50"
        step="0.01"
        inputMode="decimal"
        placeholder="Ex.: 2,5"
        value={values.km_per_liter}
        onChange={text("km_per_liter")}
        errorName={errors?.km_per_liter}
        disabled={disabled}
        onInput={(event) => formatNumericInput(event, 50, true)}
      />

      <FormInput
        label="Número de eixos *"
        htmlfor="number_of_axles"
        name="number_of_axles"
        type="number"
        min="1"
        max="10"
        step="1"
        inputMode="numeric"
        placeholder="Ex.: 3"
        hint="Vem do tipo de veículo; ajuste se este veículo for diferente."
        value={values.number_of_axles}
        onChange={text("number_of_axles")}
        errorName={errors?.number_of_axles}
        disabled={disabled}
        onInput={(event) => formatNumericInput(event, 10)}
      />

      <SelectField
        label="Status *"
        htmlfor="status"
        name="status"
        value={values.status}
        onChange={(value) => onChange("status", value)}
        errorName={errors?.status}
        disabled={disabled}
        placeholder="Selecione o status do veículo"
        hint={
          persistedStatus === "IN_ROUTE"
            ? "Em rota: a rota define o status até terminar; só é possível bloquear."
            : undefined
        }
        options={vehicleStatusOptions(persistedStatus)}
      />
    </div>
  );
};

export { VehicleFields, licensePlateMask };
