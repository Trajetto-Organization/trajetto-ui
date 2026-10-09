"use client";

import { useEffect, useState } from "react";
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
  useLiveValidation,
} from "@/components/shared/live-validation";

import { InfoBox } from "../form/info-box";
import {
  isMileageAccepted,
  MAINTENANCE_TYPE_LABELS,
  mileageRefusalMessage,
  SERVICE_ORDER_FORM_FIELDS,
} from "../lib/service-order-rules";

import type { ServiceOrderFormState } from "../form/types";

// Client-side only: the map needs the browser.
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

interface CreateServiceOrderFormSubmitProps {
  state: ServiceOrderFormState;
  businessId: string;
  vehicleId: string;
  /**
   * The master (/admin) may correct the vehicle's snapshot, which the API
   * writes back to the vehicle; everyone else sees it read-only.
   */
  canEditSnapshot: boolean;
  onBack: () => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

const CreateServiceOrderFormSubmit = ({
  state,
  businessId,
  vehicleId,
  canEditSnapshot,
  onBack,
  latitude,
  longitude,
  isLoadingLocation,
  handleLocationChange,
  handleLocationLoadingChange,
  initialFormValues,
  onFormValuesChange,
}: CreateServiceOrderFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const serverErrors = state.serviceOrderError;

  const [formValues, setFormValues] = useState<Record<string, string>>(() => ({
    date: initialFormValues.date || "",
    completion_date: initialFormValues.completion_date || "",
    maintenance_type: initialFormValues.maintenance_type || "",
    description: initialFormValues.description || "",
  }));

  const [displayTotalAmount, setDisplayTotalAmount] = useState<string>(
    () => initialFormValues.total_amount || "",
  );

  const { data: vehicle, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId,
    businessId,
  });

  // The vehicle as it is when the order opens (the snapshot).
  const [snapshot, setSnapshot] = useState(() => ({
    current_mileage_at_service:
      initialFormValues.current_mileage_at_service || "",
    maintenance_interval_km_at_service:
      initialFormValues.maintenance_interval_km_at_service || "",
    last_maintenance_mileage_at_service:
      initialFormValues.last_maintenance_mileage_at_service || "",
  }));

  const [newMileage, setNewMileage] = useState<string>(
    () => initialFormValues.new_mileage_after_service || "",
  );

  const isCompleting = Boolean(formValues.completion_date);

  useEffect(() => {
    // Fills the snapshot once the vehicle loads, unless it was kept from a
    // step back.
    if (vehicle && !initialFormValues.current_mileage_at_service) {
      setSnapshot({
        current_mileage_at_service: String(vehicle.current_mileage ?? ""),
        maintenance_interval_km_at_service: String(
          vehicle.maintenance_interval_km ?? "",
        ),
        last_maintenance_mileage_at_service:
          vehicle.last_maintenance_mileage?.toString() || "",
      });
    }
  }, [vehicle, initialFormValues.current_mileage_at_service]);

  useEffect(() => {
    // No completion date, no mileage after the service.
    if (!isCompleting) setNewMileage("");
  }, [isCompleting]);

  const setField = (field: string) => (value: string) =>
    setFormValues((current) => ({ ...current, [field]: value }));

  const setSnapshotField =
    (field: keyof typeof snapshot) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setSnapshot((current) => ({ ...current, [field]: event.target.value }));

  const handleBack = () => {
    onFormValuesChange({
      ...formValues,
      total_amount: displayTotalAmount,
      ...snapshot,
      new_mileage_after_service: newMileage,
    });
    onBack();
  };

  const currentMileage = Number(snapshot.current_mileage_at_service) || 0;
  const newMileageValue = Number(newMileage.replace(",", ".")) || 0;
  // Equal to the odometer is valid: the vehicle may not have moved (FLEET-SO-4).
  const isNewMileageValid = isMileageAccepted(newMileage, currentMileage);

  // Live validation (decision 16.700): the action's field rules, the rules
  // between fields, and the new mileage against the snapshot on screen.
  const live = useLiveValidation({
    schema: serviceOrderFieldsSchema,
    values: {
      ...formValues,
      total_amount: displayTotalAmount,
      ...snapshot,
      new_mileage_after_service: newMileage,
    },
    rules: (values) => {
      const issues = serviceOrderLiveIssues(values);

      return {
        ...issues,
        new_mileage_after_service:
          issues.new_mileage_after_service ??
          (isCompleting && !isNewMileageValid
            ? mileageRefusalMessage("behind-odometer", {
                floor: currentMileage,
                currentMileage,
              })
            : null),
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
  const pickField = (field: string) => (value: string) => {
    setField(field)(value);
    live.touch(field);
  };

  return (
    <div ref={live.ref}>
      <div className="mt-5 space-y-4">
        <InfoBox
          title={
            canEditSnapshot
              ? "ℹ️ Como funciona a quilometragem (MASTER):"
              : "ℹ️ Como funciona a quilometragem:"
          }
          items={
            canEditSnapshot
              ? [
                  {
                    icon: "✏️",
                    label: "Edição MASTER",
                    value: "Você pode corrigir os valores do snapshot",
                  },
                  {
                    icon: "🔄",
                    label: "Sincronização",
                    value: "Alterações no snapshot atualizam o veículo",
                  },
                  {
                    icon: "🔧",
                    label: "Nova quilometragem",
                    value:
                      "Ao concluir, informe a quilometragem após o serviço (igual à atual se o veículo não rodou)",
                  },
                  {
                    icon: "📋",
                    label: "Kanban",
                    value:
                      "A ordem é adicionada ao kanban (colunas padrão criadas se necessário)",
                  },
                ]
              : [
                  {
                    icon: "📸",
                    label: "Snapshot",
                    value:
                      "Os dados atuais do veículo são registrados automaticamente",
                  },
                  {
                    icon: "🔒",
                    label: "Proteção",
                    value:
                      "Os dados do snapshot não podem ser alterados (auditoria)",
                  },
                  {
                    icon: "🔧",
                    label: "Nova quilometragem",
                    value:
                      "Editável só na conclusão; igual à atual se o veículo não rodou",
                  },
                  {
                    icon: "🔄",
                    label: "Sincronização",
                    value: "O veículo é atualizado quando a ordem é concluída",
                  },
                  {
                    icon: "📋",
                    label: "Kanban",
                    value:
                      "A ordem é adicionada ao kanban (colunas padrão criadas se necessário)",
                  },
                ]
          }
          variant="blue"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DatePickerField
          label="Data da ordem de serviço *"
          htmlfor="date"
          name="date"
          value={formValues.date || ""}
          onChange={pickField("date")}
          errorName={errors?.date}
          disabled={pending}
          required
        />

        <DatePickerField
          label="Data de conclusão (opcional)"
          htmlfor="completion_date"
          name="completion_date"
          value={formValues.completion_date || ""}
          onChange={pickField("completion_date")}
          errorName={errors?.completion_date}
          disabled={pending}
        />

        <SelectField
          key={formValues.maintenance_type}
          label="Tipo de manutenção *"
          htmlfor="maintenance_type"
          name="maintenance_type"
          value={formValues.maintenance_type || ""}
          errorName={errors?.maintenance_type}
          disabled={pending}
          placeholder="Oficina própria ou de terceiro"
          options={MAINTENANCE_TYPE_OPTIONS}
          onChange={pickField("maintenance_type")}
          required
        />

        <FormInput
          label="Valor total *"
          htmlfor="total_amount"
          name="total_amount"
          type="text"
          errorName={errors?.total_amount}
          value={displayTotalAmount}
          onChange={(event) =>
            setDisplayTotalAmount(event.target.value.replace(/[^\d,.]/g, ""))
          }
          onBlur={() =>
            setDisplayTotalAmount((current) =>
              !current || current === "," || current === "."
                ? ""
                : formatToBrazilianCurrency(formatCurrencyToNumber(current)),
            )
          }
          placeholder="0,00"
          hint="Mão de obra + peças, como a oficina cobrou."
          disabled={pending}
          required
        />

        <div className="col-span-1 md:col-span-2">
          <TextareaField
            label="Descrição (opcional)"
            htmlfor="description"
            name="description"
            value={formValues.description || ""}
            onChange={(event) => setField("description")(event.target.value)}
            errorName={errors?.description}
            placeholder="Do que se trata esta ordem de serviço"
            maxLength={500}
            disabled={pending}
            className="min-h-[80px]"
          />
        </div>

        <div className="col-span-1 mt-4 md:col-span-2">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>
                {canEditSnapshot
                  ? "📸 Dados do veículo (MASTER, editáveis)"
                  : "📸 Dados do veículo (registrados automaticamente)"}
              </strong>
              <br />
              {canEditSnapshot
                ? "As alterações são aplicadas ao veículo junto com a ordem."
                : "Registrados do veículo no momento da criação; não podem ser editados."}
            </AlertDescription>
          </Alert>
        </div>

        <FormInput
          label="Quilometragem atual do veículo *"
          htmlfor="current_mileage_at_service"
          name="current_mileage_at_service"
          type="number"
          value={snapshot.current_mileage_at_service}
          onChange={
            canEditSnapshot
              ? setSnapshotField("current_mileage_at_service")
              : undefined
          }
          placeholder={
            isLoadingVehicle ? "Carregando..." : "Quilometragem atual"
          }
          errorName={errors?.current_mileage_at_service}
          readOnly={!canEditSnapshot}
          disabled={canEditSnapshot && (pending || isLoadingVehicle)}
          className={cn(!canEditSnapshot && "bg-gray-100 dark:bg-gray-800")}
          step="0.1"
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        <FormInput
          label="Intervalo de revisão (km) *"
          htmlfor="maintenance_interval_km_at_service"
          name="maintenance_interval_km_at_service"
          type="number"
          value={snapshot.maintenance_interval_km_at_service}
          onChange={
            canEditSnapshot
              ? setSnapshotField("maintenance_interval_km_at_service")
              : undefined
          }
          placeholder={
            isLoadingVehicle ? "Carregando..." : "Intervalo de revisão"
          }
          errorName={errors?.maintenance_interval_km_at_service}
          readOnly={!canEditSnapshot}
          disabled={canEditSnapshot && (pending || isLoadingVehicle)}
          className={cn(!canEditSnapshot && "bg-gray-100 dark:bg-gray-800")}
          step="0.1"
          onInput={(event) => formatNumericInput(event, 100000, true)}
        />

        <FormInput
          label="Quilometragem da última revisão (opcional)"
          htmlfor="last_maintenance_mileage_at_service"
          name="last_maintenance_mileage_at_service"
          type="number"
          value={snapshot.last_maintenance_mileage_at_service}
          onChange={
            canEditSnapshot
              ? setSnapshotField("last_maintenance_mileage_at_service")
              : undefined
          }
          placeholder={isLoadingVehicle ? "Carregando..." : "Última revisão"}
          errorName={errors?.last_maintenance_mileage_at_service}
          readOnly={!canEditSnapshot}
          disabled={canEditSnapshot && (pending || isLoadingVehicle)}
          className={cn(!canEditSnapshot && "bg-gray-100 dark:bg-gray-800")}
          step="0.1"
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        <div className="col-span-1 mt-4 md:col-span-2">
          <Alert
            className={cn(
              "border-2",
              isCompleting
                ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                : "border-gray-200 bg-gray-50 dark:bg-gray-950/20",
            )}
          >
            <CheckCircle
              className={cn(
                "h-4 w-4",
                isCompleting ? "text-green-600" : "text-muted-foreground",
              )}
            />
            <AlertDescription
              className={cn(
                isCompleting
                  ? "text-green-700 dark:text-green-300"
                  : "text-gray-600 dark:text-gray-400",
              )}
            >
              <strong>🔧 Nova quilometragem</strong>
              <br />
              {isCompleting
                ? "A ordem está sendo concluída: informe a quilometragem após o serviço (a mesma, se o veículo não rodou)."
                : "Disponível quando você define uma data de conclusão."}
            </AlertDescription>
          </Alert>
        </div>

        <div className="col-span-1 md:col-span-2">
          <FormInput
            label={
              isCompleting
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
            onChange={(event) => setNewMileage(event.target.value)}
            placeholder={
              isCompleting
                ? `Igual ou maior que ${snapshot.current_mileage_at_service || 0} km`
                : "Disponível só ao concluir a ordem de serviço"
            }
            disabled={pending || isLoadingVehicle || !isCompleting}
            required={isCompleting}
            onInput={(event) => formatNumericInput(event, 9999999, true)}
            className={cn(!isCompleting && "bg-gray-100 dark:bg-gray-800")}
          />

          {newMileage && isNewMileageValid && isCompleting && (
            <p className="mt-1 text-sm text-green-600">
              ✅ Quilometragem válida (+
              {(newMileageValue - currentMileage).toFixed(1)} km rodados)
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
          // Always enabled on create (decision 16.701): pressing it shows
          // what is missing; only real states disable it.
          disabled={pending || isLoadingVehicle || isLoadingLocation}
        >
          <span>Criar Ordem de Serviço</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

export { CreateServiceOrderFormSubmit };
