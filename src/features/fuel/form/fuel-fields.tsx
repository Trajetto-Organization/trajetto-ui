"use client";

import FormInput from "@/components/shared/custom/form-input";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { litersToNumber, mileageToNumber } from "@/lib/format-values";

import type { FuelFormValues, useFuelInputs } from "./use-fuel-inputs";

interface FuelFieldErrors {
  refueling_date?: string[];
  current_mileage?: string[];
  liters_amount?: string[];
  price_per_liter?: string[];
  notes?: string[];
}

interface FuelFieldsProps {
  inputs: ReturnType<typeof useFuelInputs>;
  errors?: FuelFieldErrors;
  disabled: boolean;
  /** A note under the km (fuelMileageNote): what the form knows, never a verdict. */
  mileageHint?: string | null;
}

/**
 * The five fields of a refueling, the same in create and edit.
 *
 * What the person types is formatted ("15.234"); what the form posts is the
 * number, from the hidden inputs beside each field. Labels follow decision
 * 3.3 ("Nome *" / "(opcional)").
 */
const FuelFields = ({
  inputs,
  errors,
  disabled,
  mileageHint,
}: FuelFieldsProps): JSX.Element => {
  const { values } = inputs;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DatePickerField
        label="Data do abastecimento *"
        htmlfor="refueling_date"
        name="refueling_date"
        value={values.refueling_date}
        onChange={inputs.setRefuelingDate}
        errorName={errors?.refueling_date}
        disabled={disabled}
      />

      <div>
        <FormInput
          label="Quilometragem *"
          htmlfor="current_mileage_display"
          name="current_mileage_display"
          type="text"
          inputMode="numeric"
          placeholder="Ex: 15.234"
          errorName={errors?.current_mileage}
          hint={mileageHint ?? undefined}
          disabled={disabled}
          value={values.current_mileage}
          onChange={inputs.handleMileageChange}
        />
        <input
          type="hidden"
          name="current_mileage"
          value={mileageToNumber(values.current_mileage)}
        />
      </div>

      <div>
        <FormInput
          label="Quantidade de litros *"
          htmlfor="liters_amount_display"
          name="liters_amount_display"
          type="text"
          inputMode="decimal"
          placeholder="Ex: 45,237"
          errorName={errors?.liters_amount}
          disabled={disabled}
          value={values.liters_amount}
          onChange={inputs.handleLitersChange}
        />
        <input
          type="hidden"
          name="liters_amount"
          value={litersToNumber(values.liters_amount)}
        />
      </div>

      <FormInput
        label="Preço por litro *"
        htmlfor="price_per_liter"
        name="price_per_liter"
        type="text"
        inputMode="decimal"
        placeholder="Ex: 5,899"
        errorName={errors?.price_per_liter}
        disabled={disabled}
        value={values.price_per_liter}
        onChange={inputs.handlePriceChange}
        onBlur={inputs.handlePriceBlur}
      />

      <div className="col-span-1 md:col-span-2">
        <FormInput
          label="Observações (opcional)"
          htmlfor="notes"
          name="notes"
          type="text"
          placeholder="Digite observações sobre o abastecimento..."
          errorName={errors?.notes}
          disabled={disabled}
          maxLength={500}
          value={values.notes}
          onChange={(event) => inputs.setNotes(event.target.value)}
        />
      </div>
    </div>
  );
};

export { FuelFields, type FuelFieldErrors, type FuelFormValues };
