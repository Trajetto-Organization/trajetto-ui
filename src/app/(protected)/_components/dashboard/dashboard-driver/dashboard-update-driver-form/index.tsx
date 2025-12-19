import { useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateDriver } from "@/actions/update-driver";

import { useCepValidation } from "../../../hooks";
import { useDashboardUpdateDriverForm } from "./hooks";

import {
  DashboardUpdateDriverFormProps,
  DashboardUpdateDriverSubmitProps,
  DashboardUpdateDriverFormState,
} from "./dto";

import { DatePickerField, SelectField } from "../../../custom";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { DashboardDriverProps } from "../dto";

import { SelectBranchStep } from "@/app/(protected)/_components/steps/select-branch-step";
import { useAuthStore } from "@/store/auth-store";

const DashboardUpdateDriverFormSubmit = ({
  state,
  driverData,
  isBranchDirty,
  isUpdateDriverOpen,
  onBack,
}: DashboardUpdateDriverSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const {
    updatedFields: allFields,
    cepLoading,
    handleFieldChange,
    formValues,
    isDirty: hookIsDirty,
  } = useCepValidation({
    isOpen: isUpdateDriverOpen,
    initialData: driverData,
  });

  // Function to handle change in custom fields
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value);
  };

  // Add this helper function
  // Função auxiliar para normalizar formatos de data para comparação
  const normalizeDateFormat = (dateString: string): string => {
    if (!dateString) return "";

    // Formato DD/MM/YYYY
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // Converte para YYYY-MM-DD
      }
    }

    // Formato ISO com T
    if (dateString.includes("T")) {
      return dateString.split("T")[0]; // Obtém apenas a parte da data
    }

    return dateString;
  };

  // Check if any main field has changed
  const isNameChanged =
    formValues?.hasOwnProperty("name") && formValues.name !== driverData.name;
  const isCPFChanged =
    formValues?.hasOwnProperty("cpf") && formValues.cpf !== driverData.cpf;
  const isCNHChanged =
    formValues?.hasOwnProperty("cnh") && formValues.cnh !== driverData.cnh;
  const isRGChanged =
    formValues?.hasOwnProperty("rg") &&
    formValues.rg?.replace(/\D/g, "") !==
      driverData.rg?.toString().replace(/\D/g, "");
  const isStatusChanged =
    formValues?.hasOwnProperty("status") &&
    formValues.status !== driverData.status;
  const isContractTypeChanged =
    formValues?.hasOwnProperty("contract_type") &&
    formValues.contract_type !== driverData.contract_type;

  // Then use this for comparison

  const isBirthDateChanged =
    formValues?.hasOwnProperty("birth_date") &&
    normalizeDateFormat(formValues.birth_date) !==
      normalizeDateFormat(driverData.birth_date);

  // Calculate if the form is dirty
  const isDirty =
    hookIsDirty ||
    isNameChanged ||
    isCPFChanged ||
    isCNHChanged ||
    isRGChanged ||
    isStatusChanged ||
    isContractTypeChanged ||
    isBirthDateChanged;

  // Filter address fields for display
  const addressFields = allFields.filter((f) =>
    ["cep", "city", "uf", "street", "address_number", "complement"].includes(
      f.name,
    ),
  );

  // Initialize form values when the component mounts
  useEffect(() => {
    if (driverData && isUpdateDriverOpen) {
      const fieldsToCheck: Array<keyof DashboardDriverProps> = [
        "name",
        "birth_date",
        "cnh",
        "cpf",
        "rg",
        "status",
        "contract_type",
      ];

      fieldsToCheck.forEach((field) => {
        if (driverData[field] && !formValues.hasOwnProperty(field)) {
          handleFieldChange(field, driverData[field]);
        }
      });
    }
  }, [driverData, isUpdateDriverOpen, handleFieldChange]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Driver's name */}
        <FormInput
          label="Nome do motorista"
          htmlfor="name"
          name="name"
          type="text"
          placeholder="Digite o nome do motorista"
          value={
            formValues?.hasOwnProperty("name")
              ? formValues.name
              : driverData.name || ""
          }
          onChange={(e) => handleFieldChange("name", e.target.value)}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)[
              "name"
            ]
          }
          disabled={pending}
          autoComplete="name"
        />

        {/* Date of Birth */}
        <DatePickerField
          label="Data de Nascimento"
          htmlfor="birth_date"
          name="birth_date"
          value={
            formValues?.hasOwnProperty("birth_date")
              ? formValues.birth_date
              : driverData.birth_date || ""
          }
          onChange={handleCustomFieldChange("birth_date")}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)[
              "birth_date"
            ]
          }
          disabled={pending}
        />

        <FormInput
          label="CPF"
          htmlfor="cpf"
          name="cpf"
          type="text"
          placeholder="000.000.000-00"
          mask="999.999.999-99"
          value={
            formValues?.hasOwnProperty("cpf")
              ? formValues.cpf
              : driverData.cpf || ""
          }
          onChange={(e) => handleFieldChange("cpf", e.target.value)}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)["cpf"]
          }
          disabled={pending}
        />

        <FormInput
          label="RG"
          htmlfor="rg"
          name="rg"
          type="text"
          placeholder="00.000.000-0"
          mask="99.999.999-9"
          value={
            formValues?.hasOwnProperty("rg")
              ? formValues.rg
              : driverData.rg || ""
          }
          onChange={(e) => handleFieldChange("rg", e.target.value)}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)["rg"]
          }
          disabled={pending}
        />

        <FormInput
          label="CNH"
          htmlfor="cnh"
          name="cnh"
          type="text"
          placeholder="00000000000"
          mask="99999999999"
          value={
            formValues?.hasOwnProperty("cnh")
              ? formValues.cnh
              : driverData.cnh || ""
          }
          onChange={(e) => handleFieldChange("cnh", e.target.value)}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)["cnh"]
          }
          disabled={pending}
        />

        {/* Status */}
        <SelectField
          label="Status"
          htmlfor="status"
          name="status"
          value={
            formValues?.hasOwnProperty("status")
              ? formValues.status
              : driverData.status || ""
          }
          onChange={handleCustomFieldChange("status")}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)[
              "status"
            ]
          }
          placeholder="Selecione o status do motorista"
          options={[
            { value: "ACTIVE", label: "Ativo" },
            { value: "INACTIVE", label: "Inativo" },
          ]}
          disabled={pending}
        />

        {/* Contract Type */}
        <SelectField
          label="Tipo de Contrato"
          htmlfor="contract_type"
          name="contract_type"
          value={
            formValues?.hasOwnProperty("contract_type")
              ? formValues.contract_type
              : driverData.contract_type || ""
          }
          onChange={handleCustomFieldChange("contract_type")}
          errorName={
            ((state.updateDriverError ?? {}) as Record<string, string[]>)[
              "contract_type"
            ]
          }
          placeholder="Selecione o tipo de contrato"
          options={[
            { value: "OWNED", label: "Próprio" },
            { value: "THIRD_PARTY", label: "Terceirizado" },
          ]}
          disabled={pending}
        />

        {/* Address fields */}
        {addressFields.map((field) => (
          <FormInput
            key={field.name}
            {...field}
            errorName={
              ((state.updateDriverError ?? {}) as Record<string, string[]>)[
                field.name
              ]
            }
            disabled={field.disabled || pending}
          />
        ))}
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || cepLoading || !(isDirty || isBranchDirty)}
        >
          <span>Atualizar Motorista</span>
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

const DashboardUpdateDriverForm = ({
  driverData,
  handleCloseUpdateDriver,
  isUpdateDriverOpen,
}: DashboardUpdateDriverFormProps): JSX.Element => {
  const defaultState: DashboardUpdateDriverFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateDriverFormState,
    FormData
  >(handleUpdateDriver, defaultState);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    handleBack,
    handleContinue,
    handleUpdateSearchBranchInputValue,
    isBranchDirty,
  } = useDashboardUpdateDriverForm({
    state,
    driverData,
    handleCloseUpdateDriver,
    isUpdateDriverOpen,
  });

  const { businessId } = useAuthStore();

  return (
    <Dialog open={isUpdateDriverOpen} onOpenChange={handleCloseUpdateDriver}>
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-branch"
              ? "Selecionar Filial (Opcional)"
              : "Editar Motorista"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja editar o motorista."
              : "Atualize as informações do motorista conforme necessário."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateDriverError?.branchId}
            searchBranchIsOptional={true}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                businessId: businessId as string,
                branchId: commandBranchInputValue.branchId,
                driverId: driverData.id,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <DashboardUpdateDriverFormSubmit
              isUpdateDriverOpen={isUpdateDriverOpen}
              isBranchDirty={isBranchDirty}
              state={state}
              driverData={driverData}
              onBack={handleBack}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateDriverForm };
