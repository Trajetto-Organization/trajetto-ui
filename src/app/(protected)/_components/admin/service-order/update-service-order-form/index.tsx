import { useState, useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle, Edit, Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateServiceOrder } from "@/actions/update-service-order";

import { cn } from "@/lib/utils";
import {
  formatCurrencyToNumber,
  formatNumericInput,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { useUpdateServiceOrderForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchSupplier } from "../../../search-supplier";

import { SearchUser } from "../../../search-user";
import { DatePickerField, SelectField } from "../../../custom";

import {
  UpdateServiceOrderFormState,
  SelectBusinessByStepProps,
  UpdateServiceOrderFormProps,
  SelectVehicleSupplierStepProps,
  SelectUserStepProps,
  UpdateServiceOrderContainerProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useFetchVehicleData } from "../../../search-vehicle-by-id-business";

// Step 1: Select Business and Branch
const SelectBusinessStep = ({
  state,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: SelectBusinessByStepProps) => {
  return (
    <div className="space-y-6">
      {(searchBranchInputValue || searchBusinessInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() => ({
                  businessId: "",
                  searchBusinessInputValue: "",
                })}
              >
                <X />
              </Button>
            </div>
          )}

          {searchBranchInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Filial:</span>
                <span className="w-full truncate">
                  {searchBranchInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBranchInputValue({
                    branchId: "",
                    searchBranchInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={`grid ${
          searchBusinessInputValue
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        } gap-4`}
      >
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.updateServiceOrderError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.updateServiceOrderError?.branchId}
            searchBranchInputValue={searchBranchInputValue}
            businessId={businessId}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
          />
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue || !branchId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Vehicle and Supplier
const SelectVehicleSupplierStep = ({
  state,
  businessId,
  commandVehicleInputValue,
  commandSupplierInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchSupplierInputValue,
  onContinue,
  onBack,
}: SelectVehicleSupplierStepProps) => {
  return (
    <div className="space-y-6">
      {/* Wrap in conditional & grid similar to SelectBusinessStep */}
      {(commandVehicleInputValue.searchVehicleInputValue ||
        commandSupplierInputValue.searchSupplierInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Display selected Vehicle if any */}
          {commandVehicleInputValue.searchVehicleInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Veículo:</span>
                <span className="w-full truncate">
                  {commandVehicleInputValue.searchVehicleInputValue}
                  {commandVehicleInputValue.vehicleLicensePlate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Placa: {commandVehicleInputValue.vehicleLicensePlate})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchVehicleInputValue({
                    vehicleId: "",
                    searchVehicleInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {/* Display selected Supplier if any */}
          {commandSupplierInputValue.searchSupplierInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Fornecedor:</span>
                <span className="w-full truncate">
                  {commandSupplierInputValue.searchSupplierInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchSupplierInputValue({
                    supplierId: "",
                    searchSupplierInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehicle Selection (Required) */}
        <div>
          <SearchVehicle
            errorVehicleId={state.updateServiceOrderError?.vehicleId}
            selectedVehicleId={commandVehicleInputValue.vehicleId}
            businessId={businessId}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
          />
        </div>

        {/* Supplier Selection (Optional) */}
        <div>
          <SearchSupplier
            errorSupplierId={state.updateServiceOrderError?.supplierId}
            searchSupplierInputValue={
              commandSupplierInputValue.searchSupplierInputValue
            }
            businessId={businessId}
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            isOptional={true}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!commandVehicleInputValue.vehicleId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 3: Select User
const SelectUserStep = ({
  state,
  businessId,
  commandUserInputValue,
  handleUpdateSearchUserInputValue,
  onContinue,
  onBack,
}: SelectUserStepProps) => {
  return (
    <div className="space-y-6">
      {/* Display selected User if any */}
      {commandUserInputValue.searchUserInputValue && (
        <div className="grid grid-cols-1 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Usuário Responsável:</span>
              <span className="w-full truncate">
                {commandUserInputValue.searchUserInputValue}
                {commandUserInputValue.responsibleUserEmail && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (E-mail: {commandUserInputValue.responsibleUserEmail})
                  </span>
                )}
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchUserInputValue({
                  userId: "",
                  searchUserInputValue: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      {/* User Selection (Required) */}
      <SearchUser
        errorUserId={state.updateServiceOrderError?.responsibleUserId}
        selectedUserId={commandUserInputValue.userId}
        businessId={businessId}
        handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!commandUserInputValue.userId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 4: Update Service Order with all fields
const UpdateServiceOrderContainer = ({
  state,
  onBack,
  serviceOrderData,
  isBusinessAndEntityDirty,
  isUpdateServiceOrderOpen,
  commandBusinessInputValue,
  commandVehicleInputValue,
}: UpdateServiceOrderContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Fetch current vehicle data for validation
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || serviceOrderData.vehicleId,
    businessId:
      commandBusinessInputValue.businessId ||
      (serviceOrderData.businessId as string),
  });

  // Snapshot data
  const [snapshotData, setSnapshotData] = useState({
    current_mileage_at_service: "",
    maintenance_interval_km_at_service: "",
    last_maintenance_mileage_at_service: "",
  });

  // New mileage (only editable)
  const [newMileageAfterService, setNewMileageAfterService] =
    useState<string>("");

  const [serviceOrderMileageAfterService, setServiceOrderMileageAfterService] =
    useState<string>("");

  // Initialize form values when the component mounts
  useEffect(() => {
    if (serviceOrderData && isUpdateServiceOrderOpen) {
      setFormValues({
        date: serviceOrderData.date,
        completion_date:
          serviceOrderData.completion_date &&
          serviceOrderData.completion_date !== "N/A"
            ? serviceOrderData.completion_date
            : "",
        maintenance_type: serviceOrderData.maintenance_type,
        total_amount: serviceOrderData.total_amount,
      });

      // Initialize snapshot data
      setSnapshotData({
        current_mileage_at_service:
          serviceOrderData.current_mileage_at_service?.toString() || "",
        maintenance_interval_km_at_service:
          serviceOrderData.maintenance_interval_km_at_service?.toString() || "",
        last_maintenance_mileage_at_service:
          serviceOrderData.last_maintenance_mileage_at_service?.toString() ||
          "",
      });

      setServiceOrderMileageAfterService(
        serviceOrderData.new_mileage_after_service?.toString() || "",
      );

      if (
        serviceOrderData.completion_date &&
        serviceOrderData.completion_date !== "N/A"
      ) {
        setNewMileageAfterService(
          serviceOrderData.new_mileage_after_service?.toString() || "",
        );
      }
    }
  }, [serviceOrderData, isUpdateServiceOrderOpen]);

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
          const originalIsEmpty = !originalValue || originalValue === "N/A";
          const newIsEmpty = !val;

          if (originalIsEmpty && newIsEmpty) return false;
          if (originalIsEmpty !== newIsEmpty) return true;

          return originalValue !== val;
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

  const [displayTotalAmount, setDisplayTotalAmount] = useState<string>(
    serviceOrderData.total_amount || "",
  );

  useEffect(() => {
    if (serviceOrderData && serviceOrderData.total_amount) {
      setDisplayTotalAmount(serviceOrderData.total_amount);
    }
  }, [serviceOrderData]);

  const handleTotalAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayTotalAmount(inputValue);
    handleFieldChange("total_amount", inputValue);
  };

  const handleTotalAmountBlur = (): void => {
    if (
      !displayTotalAmount ||
      displayTotalAmount === "," ||
      displayTotalAmount === "."
    ) {
      setDisplayTotalAmount("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayTotalAmount);
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayTotalAmount(formattedValue);
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

  // Dynamic calculation based on the current state of the form
  const wasCompleted =
    !!serviceOrderData.completion_date &&
    serviceOrderData.completion_date !== "N/A";

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
    !newMileageAfterService || newMileageValue >= currentVehicleMileage;

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

  // Check if there are any changes in the form
  const hasAnyChange =
    isDirty || isBusinessAndEntityDirty || isSnapshotDirty || isNewMileageDirty;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Date */}
        <DatePickerField
          label="Data da ordem de serviço"
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
          label="Tipo de manutenção"
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
          label={"Valor total"}
          htmlfor={"total_amount"}
          name="total_amount"
          type="text"
          errorName={state.updateServiceOrderError?.total_amount}
          value={displayTotalAmount}
          onChange={handleTotalAmountChange}
          onBlur={handleTotalAmountBlur}
          placeholder={"0,00"}
          disabled={pending}
        />

        {/* ====== SECTION: HISTORICAL DATA SNAPSHOT ====== */}
        <div className="col-span-2 mt-6">
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
            className="col-span-2 mt-4 p-4 bg-blue-50 
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
        <div className="col-span-2 mt-6">
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
        <div className="col-span-2">
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
                ? `Digite a quilometragem após o serviço (deve ser ≥ ${currentVehicleMileage} km - valor atual do veículo)`
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
              ⚠️ A nova quilometragem deve ser maior ou igual a{" "}
              {currentVehicleMileage} km (quilometragem atual do veículo)
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

        {/* History Information */}
        <div className="col-span-2 mt-4">
          <div
            className="bg-purple-50 dark:bg-purple-900/20 
            p-4 rounded-lg border border-purple-200"
          >
            <h4
              className="font-semibold text-purple-700 
              dark:text-purple-300 mb-2"
            >
              📊 Informações de Controle:
            </h4>
            <div
              className="text-sm text-purple-600 
              dark:text-purple-400 space-y-1"
            >
              <div>
                • <strong>Data de criação:</strong>{" "}
                {serviceOrderData.created_at}
              </div>
              <div>
                • <strong>Última atualização:</strong>{" "}
                {serviceOrderData.updated_at}
              </div>
              <div>
                • <strong>Status:</strong>{" "}
                {wasCompleted ? "✅ Finalizada" : "🔄 Em andamento"}
              </div>
              {serviceOrderData.current_mileage_at_service && (
                <div>
                  • <strong>Snapshot capturado:</strong>{" "}
                  {serviceOrderData.current_mileage_at_service} km
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || !hasAnyChange || !isFormValid}
        >
          <span>Atualizar Ordem de Serviço</span>
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

const UpdateServiceOrderForm = ({
  serviceOrderData,
  handleCloseUpdateServiceOrder,
  isUpdateServiceOrderOpen,
}: UpdateServiceOrderFormProps): JSX.Element => {
  const defaultState: UpdateServiceOrderFormState = {};
  const [state, dispatch] = useFormState(handleUpdateServiceOrder, null);

  const {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleBusinessStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBusinessStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
  } = useUpdateServiceOrderForm({
    state,
    handleCloseUpdateServiceOrder,
    serviceOrderData,
    isUpdateServiceOrderOpen,
  });

  return (
    <Dialog
      open={isUpdateServiceOrderOpen}
      onOpenChange={() => {
        if (isUpdateServiceOrderOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateServiceOrder();
      }}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Atualizar Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa e filial para a qual deseja atualizar a ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            state={state ?? defaultState}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : currentStep === "select-vehicle-supplier" ? (
          <SelectVehicleSupplierStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandVehicleInputValue={commandVehicleInputValue}
            commandSupplierInputValue={commandSupplierInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            onContinue={handleVehicleSupplierStepContinue}
            onBack={handleBackToBusinessStep}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            state={state ?? defaultState}
            businessId={commandBusinessInputValue.businessId}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToVehicleSupplierStep}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                serviceOrderId: serviceOrderData.id,
                businessId: commandBusinessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                vehicleId: commandVehicleInputValue.vehicleId,
                supplierId: commandSupplierInputValue.supplierId,
                responsibleUserId: commandUserInputValue.userId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateServiceOrderContainer
              state={state ?? defaultState}
              onBack={handleBackToUserStep}
              serviceOrderData={serviceOrderData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateServiceOrderOpen={isUpdateServiceOrderOpen}
              commandVehicleInputValue={commandVehicleInputValue}
              commandBusinessInputValue={commandBusinessInputValue}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateServiceOrderForm };
