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

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateSupplier } from "@/actions/supplier/create-supplier";
import { CreateSupplierFormSubmitProps, CreateSupplierFormState } from "./dto";

import { useCreateSupplierForm } from "./hooks";
import { useCepValidation } from "../../../hooks";

import { SelectBusinessStep } from "@/app/(protected)/_components/steps/select-business-step";

const CreateSupplierFormSubmit = ({
  state,
  isCreateSupplierForm,
  onBack,
  initialFormValues,
  onFormValuesChange,
}: CreateSupplierFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const {
    updatedFields: allFields,
    cepLoading,
    handleFieldChange,
    formValues,
  } = useCepValidation({
    isOpen: isCreateSupplierForm,
    initialData: initialFormValues,
  });

  // Save form values when going back
  const handleBack = () => {
    onFormValuesChange(formValues);
    onBack();
  };

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
    label: "Nome do Fornecedor *",
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
    if (optionalFields.includes(field.name)) {
      const labelWithoutAsterisk = field.label.replace(" *", "");

      return {
        ...field,
        label: `${labelWithoutAsterisk} (opcional)`,
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
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || cepLoading}
        >
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
  const [state, dispatch] = useFormState<CreateSupplierFormState, FormData>(
    handleCreateSupplier,
    defaultState,
  );

  const {
    isCreateSupplierForm,
    getBusinessIdError,
    formRef,
    handleCloseDialog,
    currentStep,
    selectedBusiness,
    handleBack,
    handleUpdateSearchBusinessInputValue,
    handleContinue,
    supplierFormValues,
    handleFormValuesChange,
  } = useCreateSupplierForm(state);

  const createSupplierForm = (supplierFormData: FormData) => {
    supplierFormData.append("businessId", selectedBusiness.businessId);
    return dispatch(supplierFormData);
  };

  return (
    <Dialog open={isCreateSupplierForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Fornecedor
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
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
            commandBusinessInputValue={selectedBusiness}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            onContinue={handleContinue}
            errorBusinessId={getBusinessIdError()}
          />
        ) : (
          <form ref={formRef} action={createSupplierForm}>
            <CreateSupplierFormSubmit
              isCreateSupplierForm={isCreateSupplierForm}
              state={state}
              onBack={handleBack}
              initialFormValues={supplierFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateSupplierForm };
