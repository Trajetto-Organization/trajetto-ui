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

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateSupplier } from "@/actions/create-supplier";
import {
  CreateSupplierContainerProps,
  CreateSupplierFormState,
  SelectBusinessByStepProps,
} from "./dto";

import { useCreateSupplierForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { useCepValidation } from "../../../hooks";

import { cn } from "@/lib/utils";

const SelectBusinessStep = ({
  searchBusinessInputValue,
  handleUpdateSearchBussinessInputValue,
  onContinue,
  errorBusinessId,
}: SelectBusinessByStepProps) => {
  return (
    <div className="space-y-6">
      {searchBusinessInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-center max-w-96 block leading-4",
            )}
          >
            {searchBusinessInputValue}
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

      <SearchBusiness
        errorBusinessId={errorBusinessId}
        searchBusinessInputValue={searchBusinessInputValue}
        handleUpdateSearchBussinessInputValue={
          handleUpdateSearchBussinessInputValue
        }
      />

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

const CreateSupplierFormContainer = ({
  state,
  isCreateSupplierForm,
  onBack,
}: CreateSupplierContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const {
    updatedFields: allFields,
    cepLoading,
    handleFieldChange,
    formValues,
  } = useCepValidation({
    isOpen: isCreateSupplierForm,
  });

  // Filter unwanted fields
  const excludedFields = [
    "corporate_reason",
    "fantasy_name",
    "cnae",
    "erp_code",
    "responsible_name",
  ];

  const filteredFields = allFields.filter(
    (field) => !excludedFields.includes(field.name),
  );

  // Add name field for supplier
  // Ensure nameField has the same type as FieldProps
  const nameField: (typeof allFields)[0] = {
    label: "Nome do Fornecedor",
    htmlfor: "name",
    name: "name",
    type: "text",
    placeholder: "Digite o nome do fornecedor",
    value: formValues?.name || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleFieldChange("name", e.target.value),
    disabled: false,
    autoComplete: "organization",
  };

  // Ensure that the CNPJ field is maintained, as it is important for suppliers
  const cnpjField = allFields.find((field) => field.name === "cnpj");

  // Match the fields in the correct order
  // Set supplierFields to be the same type as allFields
  const supplierFields: typeof allFields = [nameField];

  // Add CNPJ right after the name, if found
  if (cnpjField) {
    supplierFields.push(cnpjField);
  }

  // Add the remaining filtered fields
  filteredFields
    .filter((field) => field.name !== "cnpj") // Exclude CNPJ as it has already been added
    .forEach((field) => {
      supplierFields.push(field);
    });

  const optionalFields = [
    "cep",
    "city",
    "uf",
    "street",
    "address_number",
    "telephone",
    "email",
  ];

  const finalSupplierFields = supplierFields.map((field) => {
    if (
      optionalFields.includes(field.name) &&
      !field.label.includes("opcional")
    ) {
      return {
        ...field,
        label: `${field.label} (opcional)`,
      };
    }
    return field;
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {finalSupplierFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={
              ((state.createSupplierError ?? {}) as Record<string, string[]>)[
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
          <span>Criar Fornecedor</span>
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

const CreateSupplierForm = (): JSX.Element => {
  const defaultState: CreateSupplierFormState = {};
  const [state, dispatch] = useFormState(handleCreateSupplier, null);

  const {
    isCreateSupplierForm,
    getBusinessIdError,
    formRef,
    handleCloseDialog,
    currentStep,
    selectedBusiness,
    handleBack,
    handleUpdateSearchBussinessInputValue,
    handleContinue,
  } = useCreateSupplierForm(state);

  return (
    <Dialog open={isCreateSupplierForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Fornecedor
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : "Criar Novo Fornecedor"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja criar um fornecedor."
              : "Insira as informações solicitadas abaixo para concluir a criação do fornecedor."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            searchBusinessInputValue={selectedBusiness.searchBusinessInputValue}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            onContinue={handleContinue}
            errorBusinessId={getBusinessIdError()}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              formData.append("businessId", selectedBusiness.businessId);
              return dispatch(formData);
            }}
          >
            <CreateSupplierFormContainer
              isCreateSupplierForm={isCreateSupplierForm}
              state={state ?? defaultState}
              onBack={handleBack}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateSupplierForm };
