"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFormStatus } from "react-dom";

import { CheckCircle, Info, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFormFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FormInput from "@/components/shared/custom/form-input";
import { TextareaField } from "@/components/shared/custom/textarea-field";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import {
  formatCurrencyToNumber,
  formatDate,
  formatNumericInput,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { cn } from "@/lib/utils";
import {
  serviceOrderFieldsSchema,
  serviceOrderLiveIssues,
} from "@/schemas/create-update-service-order-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { InfoBox } from "../form/info-box";
import type { ServiceOrderFormState } from "../form/types";
import type { ServiceOrderRow } from "../server-table";
import {
  amountOf,
  editMileageState,
  MAINTENANCE_TYPE_LABELS,
  mileageRefusalMessage,
  SERVICE_ORDER_FORM_FIELDS,
} from "../lib/service-order-rules";
import { orderFieldsChanged, toFieldValues } from "./dirty";

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

const MAINTENANCE_TYPE_OPTIONS = Object.entries(MAINTENANCE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

interface UpdateServiceOrderFormSubmitProps {
  state: ServiceOrderFormState;
  serviceOrder: ServiceOrderRow;
  businessId: string;
  /** The vehicle picked in the previous step (may differ from the order's). */
  vehicleId: string;
  canEditSnapshot: boolean;
  /** Branch, vehicle, supplier or responsible changed in the steps. */
  isEntityDirty: boolean;
  onBack: () => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

const UpdateServiceOrderFormSubmit = ({
  state,
  serviceOrder,
  businessId,
  vehicleId,
  canEditSnapshot,
  isEntityDirty,
  onBack,
  latitude,
  longitude,
  isLoadingLocation,
  handleLocationChange,
  handleLocationLoadingChange,
  initialFormValues,
  onFormValuesChange,
}: UpdateServiceOrderFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const serverErrors = state.serviceOrderError;

  const original = useMemo(() => toFieldValues(serviceOrder), [serviceOrder]);

  // The values kept from a step back, else the order's own.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.keys(initialFormValues).length > 0
      ? { ...original, ...initialFormValues }
      : original,
  );

  const { data: vehicle, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: vehicleId || serviceOrder.vehicleId,
    businessId,
  });

  const wasCompleted = Boolean(serviceOrder.completion_date);
  const isCompleted = Boolean(values.completion_date);
  const isCompleting = isCompleted && !wasCompleted;

  useEffect(() => {
    // Clearing the completion date clears the mileage after the service.
    if (!isCompleted) {
      setValues((current) =>
        current.new_mileage_after_service
          ? { ...current, new_mileage_after_service: "" }
          : current,
      );
    }
  }, [isCompleted]);

  const set = (field: string) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const currentVehicleMileage = Number(vehicle?.current_mileage ?? 0);
  const newMileage = values.new_mileage_after_service || "";
  const newMileageValue = Number(newMileage.replace(",", ".")) || 0;

  const sameVehicle = !vehicleId || vehicleId === serviceOrder.vehicleId;

  // The master may fix the opening reading in the same save; the API judges
  // the correction against that one then.
  const openingMileage =
    canEditSnapshot && values.current_mileage_at_service
      ? Number(values.current_mileage_at_service.replace(",", "."))
      : serviceOrder.current_mileage_at_service;

  // Only a reading recorded now is judged: finishing against the odometer
  // (equal is valid, FLEET-SO-4), a correction against the order's opening
  // reading. A finished order's stored reading is history — the odometer
  // moved on after it — and judging it froze the order.
  const mileage = editMileageState({
    typed: newMileage,
    stored: original.new_mileage_after_service ?? "",
    wasCompleted,
    isCompleted,
    sameVehicle,
    currentMileage: currentVehicleMileage,
    openingMileage,
    vehicleLastMaintenanceMileage: vehicle
      ? (vehicle.last_maintenance_mileage ?? null)
      : undefined,
  });

  const isNewMileageValid = mileage.refusal === null;

  // A finished order on its own vehicle: what the field accepts is a correction.
  const isCorrecting = wasCompleted && sameVehicle;

  const hasLocationChanged =
    (serviceOrder.latitude ?? null) !== latitude ||
    (serviceOrder.longitude ?? null) !== longitude;

  // Save stays disabled until something changed (decision 2.5).
  const hasAnyChange =
    isEntityDirty ||
    hasLocationChanged ||
    orderFieldsChanged(original, values, { includeSnapshot: canEditSnapshot });

  // Live validation (decision 16.700): the action's field rules, the rules
  // between fields, and the mileage rule above as the field's message.
  const live = useLiveValidation({
    schema: serviceOrderFieldsSchema,
    values,
    rules: (current) => {
      const issues = serviceOrderLiveIssues(current);

      return {
        ...issues,
        new_mileage_after_service:
          issues.new_mileage_after_service ??
          mileageRefusalMessage(mileage.refusal, {
            floor: mileage.floor,
            currentMileage: currentVehicleMileage,
          }),
      };
    },
    fields: SERVICE_ORDER_FORM_FIELDS,
    serverErrors,
  });

  const errors = {
    ...serverErrors,
    ...Object.fromEntries(
      SERVICE_ORDER_FORM_FIELDS.map((field) => [field, live.errorOf(field)]),
    ),
  } as Partial<Record<string, string[]>>;

  // A pick (calendar, select) is a complete answer: judged without a blur.
  const pick = (field: string) => (value: string) => {
    set(field)(value);
    live.touch(field);
  };

  const handleBack = () => {
    onFormValuesChange(values);
    onBack();
  };

  return (
    <div ref={live.ref}>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DatePickerField
          label="Data da ordem de serviço *"
          htmlfor="date"
          name="date"
          value={values.date || ""}
          onChange={pick("date")}
          errorName={errors?.date}
          disabled={pending}
          required
        />

        <DatePickerField
          label="Data de conclusão (opcional)"
          htmlfor="completion_date"
          name="completion_date"
          value={values.completion_date || ""}
          onChange={pick("completion_date")}
          errorName={errors?.completion_date}
          disabled={pending}
        />

        <SelectField
          key={values.maintenance_type}
          label="Tipo de manutenção *"
          htmlfor="maintenance_type"
          name="maintenance_type"
          value={values.maintenance_type || ""}
          onChange={pick("maintenance_type")}
          errorName={errors?.maintenance_type}
          disabled={pending}
          placeholder="Oficina própria ou de terceiro"
          options={MAINTENANCE_TYPE_OPTIONS}
          required
        />

        <FormInput
          label="Valor total *"
          htmlfor="total_amount"
          name="total_amount"
          type="text"
          errorName={errors?.total_amount}
          value={values.total_amount || ""}
          onChange={(event) =>
            set("total_amount")(event.target.value.replace(/[^\d,.]/g, ""))
          }
          onBlur={() =>
            set("total_amount")(
              values.total_amount
                ? formatToBrazilianCurrency(
                    formatCurrencyToNumber(values.total_amount),
                  )
                : "",
            )
          }
          placeholder="0,00"
          hint={
            serviceOrder.parts_total !== undefined
              ? `Peças lançadas: ${formatToBrazilianCurrency(serviceOrder.parts_total)}. O total é mão de obra + peças.`
              : "Mão de obra + peças, como a oficina cobrou."
          }
          disabled={pending}
          required
        />

        <div className="col-span-1 md:col-span-2">
          <TextareaField
            label="Descrição (opcional)"
            htmlfor="description"
            name="description"
            value={values.description || ""}
            onChange={(event) => set("description")(event.target.value)}
            errorName={errors?.description}
            placeholder="Do que se trata esta ordem de serviço"
            maxLength={500}
            disabled={pending}
            className="min-h-[80px]"
          />
        </div>

        <div className="col-span-1 mt-4 md:col-span-2">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <strong>
                {canEditSnapshot
                  ? "📸 Dados do veículo na abertura (MASTER, editáveis)"
                  : "📸 Dados do veículo na abertura (somente leitura)"}
              </strong>
              <br />
              {canEditSnapshot
                ? "Enquanto a ordem estiver aberta, as alterações são aplicadas também ao veículo."
                : "Registrados quando a ordem foi aberta; servem de histórico."}
            </AlertDescription>
          </Alert>
        </div>

        {(
          [
            ["current_mileage_at_service", "Quilometragem na abertura"],
            ["maintenance_interval_km_at_service", "Intervalo de revisão (km)"],
            ["last_maintenance_mileage_at_service", "Última revisão (km)"],
          ] as const
        ).map(([field, label]) => (
          <FormInput
            key={field}
            label={canEditSnapshot ? `${label} *` : label}
            htmlfor={field}
            // Posted either way: the action's schema asks for them, and the
            // API ignores them from anyone but the master.
            name={field}
            type="number"
            step="0.1"
            value={values[field] || ""}
            onChange={
              canEditSnapshot
                ? (event) => set(field)(event.target.value)
                : undefined
            }
            errorName={errors?.[field]}
            readOnly={!canEditSnapshot}
            disabled={canEditSnapshot && pending}
            className={cn(!canEditSnapshot && "bg-gray-100 dark:bg-gray-800")}
          />
        ))}

        {vehicle && (
          <div className="col-span-1 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-900/20 md:col-span-2">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>🚗 Quilometragem atual do veículo:</strong>{" "}
              {currentVehicleMileage} km
            </p>
          </div>
        )}

        <div className="col-span-1 mt-4 md:col-span-2">
          <Alert
            className={cn(
              "border-2",
              wasCompleted
                ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                : isCompleting
                  ? "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-200 bg-gray-50 dark:bg-gray-950/20",
            )}
          >
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <span>
                <strong>🔧 Nova quilometragem</strong>
                <br />
                {wasCompleted
                  ? "A ordem já foi concluída; você pode corrigir a quilometragem informada."
                  : isCompleting
                    ? "A ordem está sendo concluída: informe a quilometragem após o serviço (a mesma, se o veículo não rodou)."
                    : "Disponível quando você define uma data de conclusão."}
              </span>
              {serviceOrder.new_mileage_after_service !== null && (
                <span>
                  Registrada após o serviço:{" "}
                  {serviceOrder.new_mileage_after_service} km
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <div className="col-span-1 md:col-span-2">
          <FormInput
            label={
              isCompleted
                ? "Nova quilometragem após o serviço *"
                : "Nova quilometragem após o serviço (opcional)"
            }
            htmlfor="new_mileage_after_service"
            name="new_mileage_after_service"
            errorName={errors?.new_mileage_after_service}
            type="number"
            min="0.1"
            max="9999999"
            step="0.1"
            value={newMileage}
            onChange={(event) =>
              set("new_mileage_after_service")(event.target.value)
            }
            placeholder={
              !isCompleted
                ? "Disponível só ao concluir a ordem de serviço"
                : isCorrecting
                  ? `Igual ou maior que ${openingMileage ?? 0} km (na abertura da ordem)`
                  : `Igual ou maior que ${currentVehicleMileage} km (atual do veículo)`
            }
            disabled={pending || !isCompleted || isLoadingVehicle}
            required={isCompleted}
            onInput={(event) => formatNumericInput(event, 9999999, true)}
            className={cn(!isCompleted && "bg-gray-100 dark:bg-gray-800")}
          />

          {mileage.isRecordedNow && isNewMileageValid && isCompleted && (
            <p className="mt-1 text-sm text-green-600">
              {mileage.isCorrection
                ? newMileageValue > currentVehicleMileage
                  ? `✅ Correção válida: o veículo passa a ${newMileageValue} km`
                  : "✅ Correção válida: a quilometragem atual do veículo não muda"
                : `✅ Quilometragem válida (+${(newMileageValue - currentVehicleMileage).toFixed(1)} km desde a atual)`}
            </p>
          )}

          {wasCompleted && newMileage && !mileage.isRecordedNow && (
            <p className="mt-1 text-sm text-muted-foreground">
              Registrada na conclusão da ordem. Para corrigi-la, o mínimo é{" "}
              {openingMileage ?? 0} km, a quilometragem do veículo na abertura
              da ordem.
            </p>
          )}
        </div>

        <div className="col-span-1 md:col-span-2">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            onLoadingChange={handleLocationLoadingChange}
            disabled={pending}
            error={errors?.latitude?.[0] || errors?.longitude?.[0]}
          />
        </div>

        <div className="col-span-1 mt-2 md:col-span-2">
          <InfoBox
            title="📊 Informações de controle:"
            items={[
              {
                label: "Criada em",
                value: formatDate(serviceOrder.created_at, "pt-BR"),
              },
              {
                label: "Última atualização",
                value: formatDate(serviceOrder.updated_at, "pt-BR"),
              },
              {
                label: "Situação",
                value: wasCompleted ? "✅ Concluída" : "🔄 Aberta",
              },
              {
                label: "Peças lançadas",
                value: `${serviceOrder.parts_count ?? serviceOrder.parts?.length ?? 0} (${formatToBrazilianCurrency(serviceOrder.parts_total ?? 0)})`,
              },
              {
                label: "Valor total",
                value: formatToBrazilianCurrency(
                  amountOf(serviceOrder.total_amount),
                ),
              },
            ]}
            variant="purple"
          />
        </div>
      </div>

      <DialogFormFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || isLoadingLocation}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          // Disabled only while nothing changed (decision 2.5); an invalid
          // value is explained on submit instead (decision 16.700).
          disabled={
            pending ||
            !canSubmitForm({ isEdit: true, isDirty: hasAnyChange }) ||
            isLoadingLocation
          }
        >
          <span>Salvar Alterações</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

export { UpdateServiceOrderFormSubmit };
