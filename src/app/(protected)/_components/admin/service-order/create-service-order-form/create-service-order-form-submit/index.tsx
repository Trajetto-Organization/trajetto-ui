import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { CheckCircle, Info, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import dynamic from "next/dynamic";
import {
  formatCurrencyToNumber,
  formatNumericInput,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import type { CreateServiceOrderFormSubmitProps } from "../create-service-order-form.types";
import { InfoBox } from "./info-box";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/shared/custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        Carregando mapa...
      </div>
    ),
  },
);

const CreateServiceOrderFormSubmit = ({
  state,
  onBack,
  commandBusinessInputValue,
  commandVehicleInputValue,
  handleLocationChange,
  handleLocationLoadingChange,
  latitude,
  longitude,
  isLoadingLocation,
  initialFormValues,
  onFormValuesChange,
}: CreateServiceOrderFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>(() => ({
    date: initialFormValues.date || "",
    completion_date: initialFormValues.completion_date || "",
    maintenance_type: initialFormValues.maintenance_type || "",
  }));

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: commandBusinessInputValue.businessId,
  });

  // 📸 SNAPSHOT: Vehicle data at the time of creation (EDITABLE FOR MASTER)
  const [snapshotData, setSnapshotData] = useState(() => ({
    current_mileage_at_service:
      initialFormValues.current_mileage_at_service || "",
    maintenance_interval_km_at_service:
      initialFormValues.maintenance_interval_km_at_service || "",
    last_maintenance_mileage_at_service:
      initialFormValues.last_maintenance_mileage_at_service || "",
  }));

  // 🔧 EDITABLE: New mileage after service
  const [newMileageAfterService, setNewMileageAfterService] = useState<string>(
    () => initialFormValues.new_mileage_after_service || "",
  );

  // Check if it is finishing (has completion_date)
  const isCompleting = !!formValues.completion_date;

  // Update snapshot when vehicle data loads (only if no persisted values)
  useEffect(() => {
    if (data && !initialFormValues.current_mileage_at_service) {
      setSnapshotData({
        current_mileage_at_service: data.current_mileage.toString(),
        maintenance_interval_km_at_service:
          data.maintenance_interval_km.toString(),
        last_maintenance_mileage_at_service:
          data.last_maintenance_mileage?.toString() || "",
      });
    }

    if (!isCompleting && !initialFormValues.new_mileage_after_service) {
      setNewMileageAfterService("");
    }
  }, [
    data,
    isCompleting,
    initialFormValues.current_mileage_at_service,
    initialFormValues.new_mileage_after_service,
  ]);

  // Function to handle changes in custom fields (select, datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>(
    () => initialFormValues.total_amount || "",
  );

  const handleUnitPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayUnitPrice(inputValue);
  };

  const handleUnitPriceBlur = (): void => {
    if (
      !displayUnitPrice ||
      displayUnitPrice === "," ||
      displayUnitPrice === "."
    ) {
      setDisplayUnitPrice("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayUnitPrice);
    setDisplayUnitPrice(formatToBrazilianCurrency(newNumericValue));
  };

  // Handle new mileage
  const handleNewMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const value = e.target.value;
    setNewMileageAfterService(value);
  };

  // Handle snapshot changes
  const handleSnapshotChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSnapshotData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  // Save form values when going back
  const handleBack = () => {
    const allFormValues: Record<string, string> = {
      ...formValues,
      total_amount: displayUnitPrice,
      current_mileage_at_service: snapshotData.current_mileage_at_service,
      maintenance_interval_km_at_service:
        snapshotData.maintenance_interval_km_at_service,
      last_maintenance_mileage_at_service:
        snapshotData.last_maintenance_mileage_at_service,
      new_mileage_after_service: newMileageAfterService,
    };

    onFormValuesChange(allFormValues);
    onBack();
  };

  // Real-time validation of new mileage
  const currentMileageSnapshot =
    parseFloat(snapshotData.current_mileage_at_service) || 0;
  const newMileageValue = parseFloat(newMileageAfterService) || 0;
  const isNewMileageValid =
    !newMileageAfterService || newMileageValue > currentMileageSnapshot;

  return (
    <>
      {/* Regras do fluxo ficam ANTES dos campos: explicam como a quilometragem
          e o kanban se comportam ao salvar, o que muda a forma de preencher. */}
      <div className="mt-5">
        <InfoBox
          title="ℹ️ Como Funciona o Sistema de Quilometragem (MASTER):"
          items={[
            {
              icon: "📸",
              label: "Edição MASTER",
              description: "Você pode editar os valores do snapshot",
            },
            {
              icon: "🔄",
              label: "Sincronização",
              description:
                "Alterações no snapshot atualizam o veículo imediatamente",
            },
            {
              icon: "🔧",
              label: "Nova Quilometragem",
              description:
                "Ao finalizar, informe a quilometragem após o serviço",
            },
            {
              icon: "📊",
              label: "Histórico",
              description: "Todas as alterações são registradas para auditoria",
            },
            {
              icon: "📋",
              label: "Kanban",
              description:
                "A ordem será automaticamente adicionada ao kanban (colunas padrão criadas se necessário)",
            },
          ]}
          variant="blue"
        />

        <InfoBox
          title="📋 Integração Automática com Kanban:"
          items={[
            {
              icon: "🏗️",
              label: "Criação",
              description:
                "Colunas padrão criadas automaticamente se não existirem",
            },
            {
              icon: "📍",
              label: "Posicionamento",
              description:
                'Card adicionado na coluna "Pendente" ou "Concluído"',
            },
            {
              icon: "🎯",
              label: "Prioridade",
              description: "Definida automaticamente pelo valor da manutenção",
            },
            {
              icon: "📅",
              label: "Vencimento",
              description: "Data calculada automaticamente (7 dias)",
            },
          ]}
          variant="green"
          className="mt-4"
        />
      </div>

      <div
        className="grid grid-cols-1
        md:grid-cols-2 gap-4 mt-5"
      >
        {/* Date */}
        <DatePickerField
          label="Data da ordem de serviço *"
          htmlfor="date"
          name="date"
          value={formValues.date || ""}
          onChange={handleCustomFieldChange("date")}
          errorName={state.createServiceOrderError?.date}
          disabled={pending}
        />

        {/* Completion Date */}
        <DatePickerField
          label="Data de conclusão (opcional)"
          htmlfor="completion_date"
          name="completion_date"
          value={formValues.completion_date || ""}
          onChange={handleCustomFieldChange("completion_date")}
          errorName={state.createServiceOrderError?.completion_date}
          disabled={pending}
        />

        {/* Maintenance Type */}
        <SelectField
          key={formValues.maintenance_type}
          label="Tipo de manutenção *"
          htmlfor="maintenance_type"
          name="maintenance_type"
          value={formValues.maintenance_type || ""}
          errorName={state.createServiceOrderError?.maintenance_type}
          disabled={pending}
          placeholder="Selecione o tipo de manutenção"
          options={[
            { value: "INTERNAL", label: "Interna" },
            { value: "EXTERNAL", label: "Externa" },
          ]}
          onChange={handleCustomFieldChange("maintenance_type")}
        />

        <FormInput
          label={"Valor total *"}
          htmlfor={"total_amount"}
          name="total_amount"
          type="text"
          errorName={state.createServiceOrderError?.total_amount}
          value={displayUnitPrice}
          onChange={handleUnitPriceChange}
          onBlur={handleUnitPriceBlur}
          placeholder={"0,00"}
          disabled={pending}
        />

        {/* ====== SECTION: VEHICLE DATA SNAPSHOT (EDITABLE FOR MASTER) ====== */}
        <div className="col-span-1 md:col-span-2 mt-6">
          <Alert
            className="border-blue-200 bg-blue-50 
            dark:bg-blue-950/20"
          >
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>📸 Dados do Veículo (MASTER - Editável)</strong>
              <br />
              Como usuário MASTER, você pode editar estes valores. As alterações
              serão aplicadas ao veículo.
            </AlertDescription>
          </Alert>
        </div>

        {/* Current Mileage - EDITABLE */}
        <FormInput
          label="📸 Quilometragem atual do veículo"
          htmlfor="current_mileage_at_service"
          name="current_mileage_at_service"
          type="number"
          value={snapshotData.current_mileage_at_service}
          onChange={handleSnapshotChange("current_mileage_at_service")}
          placeholder={
            isLoadingVehicle ? "Carregando..." : "Quilometragem atual"
          }
          errorName={state.createServiceOrderError?.current_mileage_at_service}
          disabled={pending || isLoadingVehicle}
          min="0.1"
          max="9999999"
          step="0.1"
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        {/* Snapshot Review Interval - EDITABLE */}
        <FormInput
          label="📸 Intervalo de revisão (km)"
          htmlfor="maintenance_interval_km_at_service"
          name="maintenance_interval_km_at_service"
          type="number"
          value={snapshotData.maintenance_interval_km_at_service}
          onChange={handleSnapshotChange("maintenance_interval_km_at_service")}
          placeholder={
            isLoadingVehicle ? "Carregando..." : "Intervalo de revisão"
          }
          errorName={
            state.createServiceOrderError?.maintenance_interval_km_at_service
          }
          disabled={pending || isLoadingVehicle}
          min="0.1"
          max="100000"
          step="0.1"
          onInput={(event) => formatNumericInput(event, 100000, true)}
        />

        {/* Last Revision - EDITABLE */}
        <FormInput
          label="📸 Quilometragem da última revisão"
          htmlfor="last_maintenance_mileage_at_service"
          name="last_maintenance_mileage_at_service"
          type="number"
          value={snapshotData.last_maintenance_mileage_at_service}
          onChange={handleSnapshotChange("last_maintenance_mileage_at_service")}
          placeholder={isLoadingVehicle ? "Carregando..." : "Última revisão"}
          errorName={
            state.createServiceOrderError?.last_maintenance_mileage_at_service
          }
          disabled={pending || isLoadingVehicle}
          min="0"
          max="9999999"
          step="0.1"
          onInput={(event) => formatNumericInput(event, 9999999, true)}
        />

        {/* ====== SECTION: NEW MILEAGE (EDITABLE ONLY ON COMPLETION) ====== */}
        <div className="col-span-1 md:col-span-2 mt-6">
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
                isCompleting ? "text-green-600" : "text-gray-500",
              )}
            />
            <AlertDescription
              className={cn(
                isCompleting
                  ? "text-green-700 dark:text-green-300"
                  : "text-gray-600 dark:text-gray-400",
              )}
            >
              <strong>🔧 Nova Quilometragem</strong>
              <br />
              {isCompleting
                ? "A ordem está sendo finalizada. Informe a quilometragem após o serviço (obrigatório)."
                : "Este campo só fica disponível quando você define uma data de conclusão."}
            </AlertDescription>
          </Alert>
        </div>

        {/* New Mileage - Editable only if finalizing */}
        <div className="col-span-1 md:col-span-2">
          <FormInput
            label="🔧 Nova quilometragem após o serviço"
            htmlfor="new_mileage_after_service"
            name="new_mileage_after_service"
            errorName={state.createServiceOrderError?.new_mileage_after_service}
            type="number"
            min="0.1"
            max="9999999"
            step="0.1"
            value={newMileageAfterService}
            onChange={handleNewMileageChange}
            placeholder={
              isCompleting
                ? `Digite a quilometragem após o serviço (deve ser > ${snapshotData.current_mileage_at_service} km)`
                : "Disponível apenas ao finalizar a ordem de serviço"
            }
            disabled={pending || isLoadingVehicle || !isCompleting}
            onInput={(event) => formatNumericInput(event, 9999999, true)}
            className={cn(
              !isCompleting && "bg-gray-100 dark:bg-gray-800",
              !isNewMileageValid && newMileageAfterService && "border-red-500",
            )}
          />

          {newMileageAfterService && !isNewMileageValid && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ A nova quilometragem deve ser maior que{" "}
              {snapshotData.current_mileage_at_service} km
            </p>
          )}

          {newMileageAfterService && isNewMileageValid && isCompleting && (
            <p className="text-sm text-green-600 mt-1">
              ✅ Quilometragem válida (+
              {(newMileageValue - currentMileageSnapshot).toFixed(1)} km
              rodados)
            </p>
          )}
        </div>

        {/* 📍 GEOLOCATION: Location Picker */}
        <div className="col-span-1 md:col-span-2">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            onLoadingChange={handleLocationLoadingChange}
            disabled={pending}
            error={
              state.createServiceOrderError?.latitude?.[0] ||
              state.createServiceOrderError?.longitude?.[0]
            }
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || isLoadingVehicle || isLoadingLocation}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            isLoadingVehicle ||
            isLoadingLocation ||
            (isCompleting && !isNewMileageValid)
          }
        >
          <span>Criar Ordem de Serviço</span>
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

export { CreateServiceOrderFormSubmit };
