import { useEffect, useState } from "react";

import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";

import { CheckCircle, Edit, Loader } from "lucide-react";
import { UpdateServiceOrderFormSubmitProps } from "../dto";

import { InfoBox } from "./info-box";

import { useFetchVehicleData } from "@/app/(protected)/_components/search-vehicle-by-id-business";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FormInput from "@/components/custom/form-input";
import {
  DatePickerField,
  SelectField,
} from "@/app/(protected)/_components/custom";

import {
  formatCurrencyToNumber,
  formatDate,
  formatNumericInput,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { cn } from "@/lib/utils";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        Carregando mapa...
      </div>
    ),
  },
);

const UpdateServiceOrderFormSubmit = ({
  state,
  onBack,
  serviceOrderData,
  isEntityDirty,
  commandVehicleInputValue,
  latitude,
  longitude,
  isLoadingLocation,
  handleLocationChange,
  handleLocationLoadingChange,
  initialFormValues,
  onFormValuesChange,
}: UpdateServiceOrderFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Helper to convert Date | string to string for form inputs
  const toStringValue = (value: Date | string | null | undefined): string => {
    if (!value) return "";
    if (value instanceof Date) return value.toISOString().split("T")[0];

    return value.toString();
  };

  // Initialize form values from persisted values or serviceOrderData
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    if (Object.keys(initialFormValues).length > 0) {
      return {
        date: initialFormValues.date || "",
        completion_date: initialFormValues.completion_date || "",
        maintenance_type: initialFormValues.maintenance_type || "",
        total_amount: initialFormValues.total_amount || "",
      };
    }
    // Format total_amount to match displayTotalAmount
    const totalAmountFormatted = formatToBrazilianCurrency(
      serviceOrderData.total_amount,
    );
    return {
      date: toStringValue(serviceOrderData.date),
      completion_date: toStringValue(serviceOrderData.completion_date),
      maintenance_type: serviceOrderData.maintenance_type,
      total_amount: totalAmountFormatted,
    };
  });
  const [isDirty, setIsDirty] = useState<boolean>(() => {
    // Check if persisted values are different from original
    if (Object.keys(initialFormValues).length > 0) {
      const formattedOriginalTotalAmount = formatToBrazilianCurrency(
        serviceOrderData.total_amount,
      );

      const originalDate = toStringValue(serviceOrderData.date);
      const originalCompletionDate = toStringValue(
        serviceOrderData.completion_date,
      );

      return (
        initialFormValues.date !== originalDate ||
        initialFormValues.completion_date !== originalCompletionDate ||
        initialFormValues.maintenance_type !==
          serviceOrderData.maintenance_type ||
        initialFormValues.total_amount !== formattedOriginalTotalAmount
      );
    }
    return false;
  });

  // Fetch current vehicle data for validation
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || serviceOrderData.vehicleId,
    businessId: serviceOrderData.businessId as string,
  });

  // Snapshot data - initialize from persisted values or serviceOrderData
  const [snapshotData, setSnapshotData] = useState(() => {
    if (initialFormValues.current_mileage_at_service) {
      return {
        current_mileage_at_service:
          initialFormValues.current_mileage_at_service || "",
        maintenance_interval_km_at_service:
          initialFormValues.maintenance_interval_km_at_service || "",
        last_maintenance_mileage_at_service:
          initialFormValues.last_maintenance_mileage_at_service || "",
      };
    }
    return {
      current_mileage_at_service:
        serviceOrderData.current_mileage_at_service?.toString() || "",
      maintenance_interval_km_at_service:
        serviceOrderData.maintenance_interval_km_at_service?.toString() || "",
      last_maintenance_mileage_at_service:
        serviceOrderData.last_maintenance_mileage_at_service?.toString() || "",
    };
  });

  // New mileage (only editable) - initialize from persisted values
  const [newMileageAfterService, setNewMileageAfterService] = useState<string>(
    () => initialFormValues.new_mileage_after_service || "",
  );

  const [serviceOrderMileageAfterService] = useState<string>(
    () => serviceOrderData.new_mileage_after_service?.toString() || "",
  );

  // Function to handle changes in form fields
  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormValues((prev) => {
      const stringValue = typeof value === "number" ? value.toString() : value;
      const newValues = { ...prev, [fieldName]: stringValue };

      // Check if any field has changed
      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue =
          serviceOrderData[key as keyof typeof serviceOrderData];

        // Special handling for completion_date
        if (key === "completion_date") {
          const originalIsEmpty = !originalValue;
          const newIsEmpty = !val;

          if (originalIsEmpty && newIsEmpty) return false;
          if (originalIsEmpty !== newIsEmpty) return true;

          // For completion_date, we know it's Date | string | null
          return toStringValue(originalValue as Date | string | null) !== val;
        }

        // Special handling for total_amount - compare numeric values
        if (key === "total_amount") {
          const originalNumeric =
            typeof originalValue === "number"
              ? originalValue
              : formatCurrencyToNumber(originalValue as string);
          const newNumeric = formatCurrencyToNumber(val);

          return originalNumeric !== newNumeric;
        }

        if (typeof originalValue === "number") {
          return originalValue.toString() !== val;
        }

        return originalValue !== val;
      });

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  // Function to handle changes in custom fields (select, datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value);
  };

  const handleTotalAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;

    // Remove R$ and spaces, keep only digits, comma and period
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    // Replace period with comma (Brazilian standard)
    inputValue = inputValue.replace(/\./g, ",");

    // Allow only one comma
    const parts = inputValue.split(",");
    if (parts.length > 2) {
      inputValue = parts[0] + "," + parts.slice(1).join("");
    }

    // Limit to 2 decimal places after comma
    if (parts.length === 2 && parts[1] && parts[1].length > 2) {
      inputValue = parts[0] + "," + parts[1].substring(0, 2);
    }

    handleFieldChange("total_amount", inputValue);
  };

  const handleTotalAmountBlur = (): void => {
    const currentValue = formValues.total_amount || "";

    if (!currentValue || currentValue === "," || currentValue === ".") {
      handleFieldChange("total_amount", "");
      return;
    }

    // Convert to number and format properly
    const numericValue = formatCurrencyToNumber(currentValue);
    const formattedValue = formatToBrazilianCurrency(numericValue);
    handleFieldChange("total_amount", formattedValue);
  };

  // Handle new mileage
  const handleNewMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const value = e.target.value;
    setNewMileageAfterService(value);
  };

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

  // Dynamic calculation based on the current state of the form
  const wasCompleted = !!serviceOrderData.completion_date;

  // Now uses formValues.completion_date to be reactive
  const isCompleting = !!formValues.completion_date && !wasCompleted;
  const isCurrentlyCompleted = !!formValues.completion_date;

  // Reset new mileage when removing completion date
  useEffect(() => {
    if (!isCurrentlyCompleted) {
      setNewMileageAfterService("");
    }
  }, [isCurrentlyCompleted]);

  // Real-time validation of new mileage - use current vehicle mileage
  const currentVehicleMileage = data?.current_mileage || 0;
  const newMileageValue = parseFloat(newMileageAfterService) || 0;

  const isNewMileageValid =
    !newMileageAfterService || newMileageValue > currentVehicleMileage;

  // Check if snapshot values have changed
  const isSnapshotDirty =
    snapshotData.current_mileage_at_service !==
      serviceOrderData.current_mileage_at_service?.toString() ||
    snapshotData.maintenance_interval_km_at_service !==
      serviceOrderData.maintenance_interval_km_at_service?.toString() ||
    snapshotData.last_maintenance_mileage_at_service !==
      (serviceOrderData.last_maintenance_mileage_at_service?.toString() || "");

  // Function to process new mileage value
  const preprocessNewMileage = (val: string): number | null => {
    if (!val || val.trim() === "") return null;
    const num = parseFloat(val.replace(",", "."));

    return isNaN(num) ? null : num;
  };

  // FIX: Check if new mileage is dirty considering all scenarios
  const currentNewMileage = preprocessNewMileage(newMileageAfterService);
  const originalNewMileage = serviceOrderData.new_mileage_after_service;

  const isNewMileageDirty = (() => {
    // If it doesn't have a completion date currently, it's not dirty.
    if (!isCurrentlyCompleted) return false;

    // If it had a completion date before
    if (wasCompleted) {
      return currentNewMileage !== originalNewMileage;
    }

    return currentNewMileage !== null;
  })();

  const isFormValid = (() => {
    // If it has a completion date, it MUST have valid mileage
    if (isCurrentlyCompleted) {
      // Must have value AND be valid
      return !!newMileageAfterService && isNewMileageValid;
    }

    // If it has no completion date, it is valid.
    return true;
  })();

  // 📍 Check if location has changed
  const [hasLocationChanged, setHasLocationChanged] = useState<boolean>(false);

  useEffect(() => {
    const originalLat = serviceOrderData.latitude ?? null;
    const originalLng = serviceOrderData.longitude ?? null;

    // Check if location changed (compare with original serviceOrderData values)
    const latChanged = originalLat !== latitude;
    const lngChanged = originalLng !== longitude;

    setHasLocationChanged(latChanged || lngChanged);
  }, [
    latitude,
    longitude,
    serviceOrderData.latitude,
    serviceOrderData.longitude,
  ]);

  // Check if there are any changes in the form
  const hasAnyChange =
    isDirty ||
    isEntityDirty ||
    isSnapshotDirty ||
    isNewMileageDirty ||
    hasLocationChanged;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Date */}
        <DatePickerField
          label="Data da ordem de serviço *"
          htmlfor="date"
          name="date"
          value={formValues.date || ""}
          onChange={handleCustomFieldChange("date")}
          errorName={state.updateServiceOrderError?.date}
          disabled={pending}
        />

        {/* Completion Date */}
        <DatePickerField
          label="Data de conclusão (opcional)"
          htmlfor="completion_date"
          name="completion_date"
          value={formValues.completion_date || ""}
          onChange={handleCustomFieldChange("completion_date")}
          errorName={state.updateServiceOrderError?.completion_date}
          disabled={pending}
        />

        {/* Maintenance Type */}
        <SelectField
          key={formValues.maintenance_type}
          label="Tipo de manutenção *"
          htmlfor="maintenance_type"
          name="maintenance_type"
          value={formValues.maintenance_type || ""}
          onChange={handleCustomFieldChange("maintenance_type")}
          errorName={state.updateServiceOrderError?.maintenance_type}
          disabled={pending}
          placeholder="Selecione o tipo de manutenção"
          options={[
            { value: "INTERNAL", label: "Interna" },
            { value: "EXTERNAL", label: "Externa" },
          ]}
        />

        <FormInput
          label={"Valor total *"}
          htmlfor={"total_amount"}
          name="total_amount"
          type="text"
          errorName={state.updateServiceOrderError?.total_amount}
          value={formValues.total_amount}
          onChange={handleTotalAmountChange}
          onBlur={handleTotalAmountBlur}
          placeholder={"0,00"}
          disabled={pending}
        />

        {/* ====== SECTION: HISTORICAL DATA SNAPSHOT ====== */}
        <div className="col-span-1 md:col-span-2 mt-6">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <Edit className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <strong>📸 Dados Históricos do Veículo (Editável)</strong>
              <br />
              Você pode editar os dados do snapshot. As alterações serão
              aplicadas alterando o histórico.
            </AlertDescription>
          </Alert>
        </div>

        {/* Snapshot: Current Mileage - EDITABLE */}
        <div>
          <FormInput
            label="📸 Quilometragem no início do serviço"
            htmlfor="current_mileage_at_service"
            name="current_mileage_at_service"
            type="number"
            value={snapshotData.current_mileage_at_service}
            onChange={handleSnapshotChange("current_mileage_at_service")}
            errorName={
              state.updateServiceOrderError?.current_mileage_at_service
            }
            disabled={pending}
            min="0.1"
            max="9999999"
            step="0.1"
            onInput={(event) => formatNumericInput(event, 9999999, true)}
          />
        </div>

        {/* Snapshot: Review Interval - EDITABLE */}
        <div>
          <FormInput
            label="📸 Intervalo de revisão (histórico)"
            htmlfor="maintenance_interval_km_at_service"
            name="maintenance_interval_km_at_service"
            type="number"
            value={snapshotData.maintenance_interval_km_at_service}
            onChange={handleSnapshotChange(
              "maintenance_interval_km_at_service",
            )}
            errorName={
              state.updateServiceOrderError?.maintenance_interval_km_at_service
            }
            disabled={pending}
            min="0.1"
            max="100000"
            step="0.1"
            onInput={(event) => formatNumericInput(event, 100000, true)}
          />
        </div>

        {/* Snapshot: Last Revision - EDITABLE */}
        <div>
          <FormInput
            label="📸 Última revisão (histórico)"
            htmlfor="last_maintenance_mileage_at_service"
            name="last_maintenance_mileage_at_service"
            type="number"
            value={snapshotData.last_maintenance_mileage_at_service}
            onChange={handleSnapshotChange(
              "last_maintenance_mileage_at_service",
            )}
            errorName={
              state.updateServiceOrderError?.last_maintenance_mileage_at_service
            }
            disabled={pending}
            min="0"
            max="9999999"
            step="0.1"
            onInput={(event) => formatNumericInput(event, 9999999, true)}
          />
        </div>

        {/* Current Vehicle Info */}
        {data && (
          <div
            className="col-span-1 md:col-span-2 mt-4 p-4 bg-blue-50 
            dark:bg-blue-900/20 rounded-lg border border-blue-200"
          >
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>🚗 Dados Atuais do Veículo:</strong>
              <br />
              Quilometragem atual: {data.current_mileage} km
            </p>
          </div>
        )}

        {/* ====== SECTION: NEW MILEAGE (EDITABLE) ====== */}
        <div className="col-span-1 md:col-span-2 mt-6">
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
            <CheckCircle
              className={cn(
                "h-4 w-4",
                wasCompleted
                  ? "text-green-600"
                  : isCompleting
                    ? "text-blue-600"
                    : "text-gray-500",
              )}
            />
            <AlertDescription
              className={cn(
                wasCompleted
                  ? "text-green-700 dark:text-green-300"
                  : isCompleting
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400",
                "flex flex-col gap-3",
              )}
            >
              <div>
                <strong>🔧 Nova Quilometragem</strong>
                <br />
                {wasCompleted
                  ? "Esta ordem já foi finalizada. Você pode alterar a quilometragem informada."
                  : isCompleting
                    ? "A ordem está sendo finalizada agora. Informe a quilometragem após o serviço (obrigatório)."
                    : "Este campo só fica disponível quando você define uma data de conclusão."}
              </div>

              {serviceOrderMileageAfterService && (
                <div>
                  <strong>🚗 Quilometragem registrada após o serviço:</strong>
                  <br />
                  Quilometragem registrada: {serviceOrderMileageAfterService} km
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>

        {/* New Mileage - Editable only if finalizing or already finalized */}
        <div className="col-span-1 md:col-span-2">
          <FormInput
            label="🔧 Nova quilometragem após o serviço"
            htmlfor="new_mileage_after_service"
            name="new_mileage_after_service"
            errorName={state.updateServiceOrderError?.new_mileage_after_service}
            type="number"
            min="0.1"
            max="9999999"
            step="0.1"
            value={newMileageAfterService}
            onChange={handleNewMileageChange}
            placeholder={
              isCurrentlyCompleted
                ? `Digite a quilometragem após o serviço (deve ser > ${currentVehicleMileage} km - valor atual do veículo)`
                : "Disponível apenas ao finalizar a ordem de serviço"
            }
            disabled={pending || !isCurrentlyCompleted || isLoadingVehicle}
            onInput={(event) => formatNumericInput(event, 9999999, true)}
            className={cn(
              !isCurrentlyCompleted && "bg-gray-100 dark:bg-gray-800",
              !isNewMileageValid && newMileageAfterService && "border-red-500",
            )}
          />

          {/* Visual validation feedback */}
          {newMileageAfterService && !isNewMileageValid && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ A nova quilometragem deve ser maior que {currentVehicleMileage}{" "}
              km (quilometragem atual do veículo)
            </p>
          )}

          {newMileageAfterService &&
            isNewMileageValid &&
            isCurrentlyCompleted && (
              <p className="text-sm text-green-600 mt-1">
                ✅ Quilometragem válida (+
                {(newMileageValue - currentVehicleMileage).toFixed(1)} km
                rodados desde a quilometragem atual)
              </p>
            )}

          {/* Warning when there is a date but no mileage */}
          {isCurrentlyCompleted && !newMileageAfterService && (
            <p className="text-sm text-amber-600 mt-1">
              ⚠️ A nova quilometragem é obrigatória quando a ordem de serviço é
              finalizada
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
              state.updateServiceOrderError?.latitude?.[0] ||
              state.updateServiceOrderError?.longitude?.[0]
            }
          />
        </div>

        {/* History Information */}
        <div className="col-span-1 md:col-span-2 mt-4">
          <InfoBox
            title="📊 Informações de Controle:"
            items={[
              {
                label: "Data de criação",
                value: formatDate(serviceOrderData.created_at, "pt-BR"),
              },
              {
                label: "Última atualização",
                value: formatDate(serviceOrderData.updated_at, "pt-BR"),
              },
              {
                label: "Status",
                value: wasCompleted ? "✅ Finalizada" : "🔄 Em andamento",
              },
              {
                label: "Snapshot capturado",
                value: `${serviceOrderData.current_mileage_at_service} km`,
                condition: !!serviceOrderData.current_mileage_at_service,
              },
            ]}
            variant="purple"
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
            !hasAnyChange ||
            !isFormValid ||
            isLoadingVehicle ||
            isLoadingLocation
          }
        >
          <span>Editar Ordem de Serviço</span>
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

export { UpdateServiceOrderFormSubmit };
