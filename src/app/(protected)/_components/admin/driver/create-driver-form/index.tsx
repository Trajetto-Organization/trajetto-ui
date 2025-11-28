import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  CreateDriverContainerProps,
  CreateDriverFormState,
  SelectBusinessByStepProps,
} from "./dto";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateDriver } from "@/actions/create-driver";

import { useCepValidation } from "../../../hooks";
import { useCreateDriverForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";

import { SearchBranch } from "../../../search-branch";
import { DatePickerField, SelectField } from "../../../custom";

import { cn } from "@/lib/utils";

const SelectBusinessStep = ({
  state,
  handleUpdateSearchBussinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue },
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
                onClick={() =>
                  handleUpdateSearchBussinessInputValue({
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
            handleUpdateSearchBussinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.createDriverError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.createDriverError?.branchId}
            searchBranchInputValue={searchBranchInputValue}
            businessId={businessId}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            isOptional={true}
          />
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

const CreateDriverFormContainer = ({
  state,
  isCreateDriverForm,
  onBack,
}: CreateDriverContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, cepLoading, formValues, handleFieldChange } =
    useCepValidation({
      isOpen: isCreateDriverForm,
    });

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
          label="Nome do motorista"
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
        />

        {/* Date of Birth Field (Custom Component) */}
        <DatePickerField
          label="Data de Nascimento"
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
          label="CPF"
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
          label="RG"
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
          label="CNH"
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
          label="Status"
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
          label="Tipo de Contrato"
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
        <Button type="button" variant="outline" onClick={onBack}>
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
  const [state, dispatch] = useFormState(handleCreateDriver, null);

  const {
    isCreateDriverForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinnessInputValue,
    commandBranchInputValue,
    handleBack,
    handleUpdateSearchBussinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleContinue,
  } = useCreateDriverForm(state);

  return (
    <Dialog open={isCreateDriverForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Motorista
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : "Criar Novo Motorista"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja criar um motorista (obrigatório) e opcionalmente uma filial."
              : "Insira as informações solicitadas abaixo para concluir a criação do motorista."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            state={state ?? defaultState}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleContinue}
            commandBusinnessInputValue={commandBusinnessInputValue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              formData.append(
                "businessId",
                commandBusinnessInputValue.businessId,
              );

              if (commandBranchInputValue.branchId) {
                formData.append("branchId", commandBranchInputValue.branchId);
              }

              return dispatch(formData);
            }}
          >
            <CreateDriverFormContainer
              isCreateDriverForm={isCreateDriverForm}
              state={state ?? defaultState}
              onBack={handleBack}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateDriverForm };
