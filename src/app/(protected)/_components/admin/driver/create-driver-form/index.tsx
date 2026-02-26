import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CreateDriverFormSubmitProps, CreateDriverFormState } from "./dto";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateDriver } from "@/actions/driver/create-driver";

import { useCepValidation } from "../../../hooks";
import { useCreateDriverForm } from "./hooks";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";
import { DatePickerField, SelectField } from "../../../custom";

const CreateDriverFormSubmit = ({
  state,
  isCreateDriverForm,
  onBack,
  initialFormValues,
  onFormValuesChange,
}: CreateDriverFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, cepLoading, formValues, handleFieldChange } =
    useCepValidation({
      isOpen: isCreateDriverForm,
      initialData: initialFormValues,
    });

  // Save form values when going back
  const handleBack = () => {
    onFormValuesChange(formValues);
    onBack();
  };

  // Function to handle change in custom fields
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    // We call handleFieldChange directly from the useCepValidation hook
    handleFieldChange(fieldName, value);
  };

  // Address fields
  const addressFields = updatedFields.filter((f) =>
    ["cep", "city", "uf", "street", "address_number", "complement"].includes(
      f.name,
    ),
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Driver's name - always at the top */}
        <FormInput
          label="Nome do motorista *"
          htmlfor="name"
          name="name"
          type="text"
          placeholder="Digite o nome do motorista"
          value={formValues["name"] || ""}
          onChange={(e) => handleFieldChange("name", e.target.value)}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)[
              "name"
            ]
          }
          disabled={pending}
          autoComplete="name"
        />

        {/* Date of Birth Field (Custom Component) */}
        <DatePickerField
          label="Data de Nascimento *"
          htmlfor="birth_date"
          name="birth_date"
          value={formValues["birth_date"] || ""}
          onChange={handleCustomFieldChange("birth_date")}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)[
              "birth_date"
            ]
          }
          disabled={pending}
        />

        <FormInput
          label="CPF *"
          htmlfor="cpf"
          name="cpf"
          type="text"
          placeholder="000.000.000-00"
          mask="999.999.999-99"
          value={formValues["cpf"] || ""}
          onChange={(e) => handleFieldChange("cpf", e.target.value)}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)["cpf"]
          }
          disabled={pending}
        />

        <FormInput
          label="RG *"
          htmlfor="rg"
          name="rg"
          type="text"
          placeholder="00.000.000-0"
          mask="99.999.999-9"
          value={formValues["rg"] || ""}
          onChange={(e) => handleFieldChange("rg", e.target.value)}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)["rg"]
          }
          disabled={pending}
        />

        <FormInput
          label="CNH *"
          htmlfor="cnh"
          name="cnh"
          type="text"
          placeholder="00000000000"
          mask="99999999999"
          value={formValues["cnh"] || ""}
          onChange={(e) => handleFieldChange("cnh", e.target.value)}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)["cnh"]
          }
          disabled={pending}
        />

        {/* Status (custom component) */}
        <SelectField
          label="Status *"
          htmlfor="status"
          name="status"
          value={formValues["status"]}
          onChange={handleCustomFieldChange("status")}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)[
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

        {/* Contract Type (custom component) */}
        <SelectField
          label="Tipo de Contrato *"
          htmlfor="contract_type"
          name="contract_type"
          value={formValues["contract_type"]}
          onChange={handleCustomFieldChange("contract_type")}
          errorName={
            ((state.createDriverError ?? {}) as Record<string, string[]>)[
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
            value={formValues[field.name] || ""}
            errorName={
              ((state.createDriverError ?? {}) as Record<string, string[]>)[
                field.name
              ]
            }
            disabled={field.disabled || pending}
          />
        ))}
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || cepLoading}
        >
          Voltar
        </Button>
        <Button type="submit" disabled={pending || cepLoading}>
          <span>Criar Motorista</span>
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

const CreateDriverForm = (): JSX.Element => {
  const defaultState: CreateDriverFormState = {};
  const [state, dispatch] = useFormState<CreateDriverFormState, FormData>(
    handleCreateDriver,
    defaultState,
  );

  const {
    isCreateDriverForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    handleBack,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleContinue,
    driverFormValues,
    handleFormValuesChange,
  } = useCreateDriverForm(state);

  const createDriverForm = (driverFormData: FormData) => {
    driverFormData.append("businessId", commandBusinessInputValue.businessId);

    if (commandBranchInputValue.branchId) {
      driverFormData.append("branchId", commandBranchInputValue.branchId);
    }

    return dispatch(driverFormData);
  };

  return (
    <Dialog open={isCreateDriverForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Motorista
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa"
              : "Criar Novo Motorista"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa para a qual deseja criar um motorista (obrigatório) e opcionalmente uma filial."
              : "Insira as informações solicitadas abaixo para concluir a criação do motorista."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business-branch" ? (
          <SelectBusinessBranchStep
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state?.createDriverError?.branchId}
            errorBusinessId={state.createDriverError?.businessId}
            searchBranchIsOptional={true}
          />
        ) : (
          <form ref={formRef} action={createDriverForm}>
            <CreateDriverFormSubmit
              isCreateDriverForm={isCreateDriverForm}
              state={state}
              onBack={handleBack}
              initialFormValues={driverFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateDriverForm };
