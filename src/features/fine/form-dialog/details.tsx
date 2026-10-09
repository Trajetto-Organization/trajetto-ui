"use client";

import dynamic from "next/dynamic";
import { useFormStatus } from "react-dom";
import { Loader, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IGNORE_BLUR_ATTRIBUTE } from "@/components/shared/live-validation";
import { DialogFormFooter } from "@/components/ui/dialog";

import FormInput from "@/components/shared/custom/form-input";
import { TextareaField } from "@/components/shared/custom/textarea-field";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { formatAmountInput, type FineFormState } from "../lib/form-state";
import { parseAmount } from "../lib/fine-form-schema";

// Leaflet touches `window`: client only.
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/shared/custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[300px] items-center justify-center"
        aria-busy="true"
      >
        Carregando mapa...
      </div>
    ),
  },
);

type FieldErrors = Partial<Record<keyof FineFormState, string[]>>;

interface FineDetailsStepProps {
  isEdit: boolean;
  state: FineFormState;
  errors: FieldErrors;
  /**
   * Whether the main action is enabled (canSubmitForm): always on create
   * (decision 16.701), on edit only once something changed (decision 2.5).
   */
  canSubmit: boolean;
  isLoadingLocation: boolean;
  onChange: (patch: Partial<FineFormState>) => void;
  onLoadingLocationChange: (isLoading: boolean) => void;
  onBack: () => void;
}

/**
 * The last step of the fine form: dates, amount, points, where and notes.
 * Labels follow decision 3.3 ("Nome *" / "(opcional)"); the observation is
 * multiline now, as the API accepts it.
 */
const FineDetailsStep = ({
  isEdit,
  state,
  errors,
  canSubmit,
  isLoadingLocation,
  onChange,
  onLoadingLocationChange,
  onBack,
}: FineDetailsStepProps): JSX.Element => {
  const { pending } = useFormStatus();

  const handleAmountBlur = () => {
    const parsed = parseAmount(state.amount);

    onChange({
      amount:
        typeof parsed === "number" && !Number.isNaN(parsed)
          ? formatAmountInput(parsed)
          : "",
    });
  };

  const hasPoint = state.latitude !== null && state.longitude !== null;

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DatePickerField
          label="Data da infração *"
          htmlfor="fine-violation-date"
          name="violation_date"
          value={state.violation_date}
          onChange={(value) => onChange({ violation_date: value })}
          errorName={errors.violation_date}
          disabled={pending}
          dateOnly
        />

        <DatePickerField
          label="Data de vencimento *"
          htmlfor="fine-due-date"
          name="due_date"
          value={state.due_date}
          onChange={(value) => onChange({ due_date: value })}
          errorName={errors.due_date}
          disabled={pending}
          allowFutureDates
          dateOnly
        />

        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="fine-payment-date"
          name="payment_date"
          value={state.payment_date}
          onChange={(value) => onChange({ payment_date: value })}
          errorName={errors.payment_date}
          disabled={pending}
          dateOnly
          hint={
            isEdit && state.payment_date
              ? "Para desfazer o pagamento, clique de novo na data marcada."
              : undefined
          }
        />

        <FormInput
          label="Valor da multa *"
          htmlfor="fine-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={state.amount}
          onChange={(event) =>
            onChange({ amount: event.target.value.replace(/[^\d,.R$\s]/g, "") })
          }
          onBlur={handleAmountBlur}
          errorName={errors.amount}
          placeholder="0,00"
          disabled={pending}
        />

        <FormInput
          label="Pontos na carteira *"
          htmlfor="fine-points"
          name="points"
          type="number"
          min="0"
          max="20"
          value={state.points}
          onChange={(event) => onChange({ points: event.target.value })}
          errorName={errors.points}
          hint="Preenchido com os pontos do código escolhido; ajuste se a notificação disser outro valor."
          placeholder="Ex.: 4"
          disabled={pending}
        />

        <FormInput
          label="Local da infração (opcional)"
          htmlfor="fine-location"
          name="location"
          type="text"
          maxLength={200}
          value={state.location}
          onChange={(event) => onChange({ location: event.target.value })}
          errorName={errors.location}
          placeholder="Ex.: Av. Brasil, 1000 - Centro"
          disabled={pending}
        />

        <div className="col-span-1 md:col-span-2">
          <TextareaField
            label="Observações (opcional)"
            htmlfor="fine-observation"
            name="observation"
            rows={3}
            maxLength={500}
            value={state.observation}
            onChange={(event) => onChange({ observation: event.target.value })}
            errorName={errors.observation}
            placeholder="Ex.: notificação recebida pelos Correios"
            disabled={pending}
          />
        </div>

        <div className="col-span-1 space-y-2 md:col-span-2">
          <LocationPicker
            latitude={state.latitude}
            longitude={state.longitude}
            onLocationChange={(latitude, longitude) =>
              onChange({ latitude, longitude })
            }
            onLoadingChange={onLoadingLocationChange}
            disabled={pending}
            error={errors.latitude?.[0] || errors.longitude?.[0]}
          />

          {hasPoint && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              disabled={pending}
              onClick={() => onChange({ latitude: null, longitude: null })}
            >
              <MapPinOff className="mr-1 h-4 w-4" aria-hidden="true" />
              Remover o ponto do mapa
            </Button>
          )}
        </div>
      </div>

      {/* Multi-step form: Voltar returns to the code; the main action last. */}
      <DialogFormFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={pending || isLoadingLocation}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Voltar
        </Button>

        <Button
          type="submit"
          disabled={pending || isLoadingLocation || !canSubmit}
        >
          {pending && (
            <Loader className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isEdit ? "Salvar Alterações" : "Registrar Multa"}
        </Button>
      </DialogFormFooter>
    </>
  );
};

export { FineDetailsStep, type FieldErrors };
