import { useEffect, useState } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle, Info, Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  CreateServiceOrderContainerProps,
  CreateServiceOrderFormState,
  SelectBusinessBranchStepProps,
  SelectVehicleSupplierStepProps,
  SelectUserStepProps,
} from "./dto";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateServiceOrder } from "@/actions/create-service-order";

import {
  formatCurrencyToNumber,
  formatNumericInput,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { DatePickerField, SelectField } from "../../../custom";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchSupplier } from "../../../search-supplier";

import { SearchUser } from "../../../search-user";
import { useCreateServiceOrderForm } from "./hooks";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useFetchVehicleData } from "../../../search-vehicle-by-id-business";

// Step 1: Select Business and Branch
const SelectBusinessBranchStep = ({
  state,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: SelectBusinessBranchStepProps) => {
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
                onClick={() =>
                  handleUpdateSearchBusinessInputValue({
                    businessId: "",
                    searchBusinessInputValue: "",
                  })
                }
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
          errorBusinessId={state.createServiceOrderError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.createServiceOrderError?.branchId}
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
      {/* Show selected vehicle and supplier if any */}
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
                  {commandVehicleInputValue.searchVehicleInputValue}{" "}
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
            errorVehicleId={state.createServiceOrderError?.vehicleId}
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
            errorSupplierId={state.createServiceOrderError?.supplierId}
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
                {commandUserInputValue.searchUserInputValue}{" "}
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
        errorUserId={state.createServiceOrderError?.responsibleUserId}
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

// Step 4: Create Service Order Form
const CreateServiceOrderFormContainer = ({
  state,
  onBack,
  commandBusinessInputValue,
  commandVehicleInputValue,
}: CreateServiceOrderContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: commandBusinessInputValue.businessId,
  });

  // 📸 SNAPSHOT: Vehicle data at the time of creation (EDITABLE FOR MASTER)
  const [snapshotData, setSnapshotData] = useState({
    current_mileage_at_service: "",
    maintenance_interval_km_at_service: "",
    last_maintenance_mileage_at_service: "",
  });

  // 🔧 EDITABLE: New mileage after service
  const [newMileageAfterService, setNewMileageAfterService] =
    useState<string>("");

  // Check if it is finishing (has completion_date)
  const isCompleting = !!formValues.completion_date;

  // Update snapshot when vehicle data loads
  useEffect(() => {
    if (data) {
      setSnapshotData({
        current_mileage_at_service: data.current_mileage.toString(),
        maintenance_interval_km_at_service:
          data.maintenance_interval_km.toString(),
        last_maintenance_mileage_at_service:
          data.last_maintenance_mileage?.toString() || "",
      });
    }

    if (!isCompleting) {
      setNewMileageAfterService("");
    }
  }, [data, isCompleting]);

  // Function to handle changes in custom fields (select, datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>("");

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

  // Real-time validation of new mileage
  const currentMileageSnapshot =
    parseFloat(snapshotData.current_mileage_at_service) || 0;
  const newMileageValue = parseFloat(newMileageAfterService) || 0;
  const isNewMileageValid =
    !newMileageAfterService || newMileageValue >= currentMileageSnapshot;

  return (
    <>
      <div
        className="grid grid-cols-1 
        md:grid-cols-2 gap-4 mt-5"
      >
        {/* Date */}
        <DatePickerField
          label="Data da ordem de serviço"
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
          label="Tipo de manutenção"
          htmlfor="maintenance_type"
          name="maintenance_type"
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
          label={"Valor total"}
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
        <div className="col-span-2 mt-6">
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
        <div className="col-span-2 mt-6">
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
        <div className="col-span-2">
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
                ? `Digite a quilometragem após o serviço (deve ser ≥ ${snapshotData.current_mileage_at_service} km)`
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
              ⚠️ A nova quilometragem deve ser maior ou igual a{" "}
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

        {/* Useful Information */}
        <div className="col-span-2 mt-4">
          <div
            className="bg-blue-50 dark:bg-blue-900/20 
            p-4 rounded-lg border border-blue-200"
          >
            <h4
              className="font-semibold text-blue-700 
              dark:text-blue-300 mb-2"
            >
              ℹ️ Como Funciona o Sistema de Quilometragem (MASTER):
            </h4>
            <ul
              className="text-sm text-blue-600 
              dark:text-blue-400 space-y-1"
            >
              <li>
                • <strong>📸 Edição MASTER:</strong> Você pode editar os valores
                do snapshot
              </li>
              <li>
                • <strong>🔄 Sincronização:</strong> Alterações no snapshot
                atualizam o veículo imediatamente
              </li>
              <li>
                • <strong>🔧 Nova Quilometragem:</strong> Ao finalizar, informe
                a quilometragem após o serviço
              </li>
              <li>
                • <strong>📊 Histórico:</strong> Todas as alterações são
                registradas para auditoria
              </li>
              <li>
                • <strong>📋 Kanban:</strong> A ordem será automaticamente
                adicionada ao kanban (colunas padrão criadas se necessário)
              </li>
            </ul>
          </div>

          <div
            className="bg-green-50 dark:bg-green-900/20 
            p-4 rounded-lg border border-green-200 mt-4"
          >
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
              📋 Integração Automática com Kanban:
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>
                • <strong>🏗️ Criação:</strong> Colunas padrão criadas
                automaticamente se não existirem
              </li>
              <li>
                • <strong>📍 Posicionamento:</strong> Card adicionado na coluna
                &quot;Pendente&quot; ou &quot;Concluído&quot;
              </li>
              <li>
                • <strong>🎯 Prioridade:</strong> Definida automaticamente pelo
                valor da manutenção
              </li>
              <li>
                • <strong>📅 Vencimento:</strong> Data calculada automaticamente
                (7 dias)
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || (isCompleting && !isNewMileageValid)}
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

const CreateServiceOrderForm = (): JSX.Element => {
  const defaultState: CreateServiceOrderFormState = {};
  const [state, dispatch] = useFormState(handleCreateServiceOrder, null);

  const {
    isCreateServiceOrderForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
  } = useCreateServiceOrderForm(state);

  return (
    <Dialog open={isCreateServiceOrderForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Ordem de Serviço
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Criar Nova Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja criar uma ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Insira as informações solicitadas abaixo para concluir a criação da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business-branch" ? (
          <SelectBusinessBranchStep
            state={state ?? defaultState}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
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
            onBack={handleBackToBusinessBranchStep}
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
              // Add selected IDs to form data
              formData.append(
                "businessId",
                commandBusinessInputValue.businessId,
              );
              formData.append("branchId", commandBranchInputValue.branchId);
              formData.append("vehicleId", commandVehicleInputValue.vehicleId);

              if (commandSupplierInputValue.supplierId) {
                formData.append(
                  "supplierId",
                  commandSupplierInputValue.supplierId,
                );
              }

              formData.append(
                "responsibleUserId",
                commandUserInputValue.userId,
              );

              dispatch(formData);
            }}
          >
            <CreateServiceOrderFormContainer
              state={state ?? defaultState}
              onBack={handleBackToUserStep}
              commandBusinessInputValue={commandBusinessInputValue}
              commandVehicleInputValue={commandVehicleInputValue}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateServiceOrderForm };
