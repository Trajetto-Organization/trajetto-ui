import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateSupplier } from "@/actions/update-supplier";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import {
  UpdateSupplierContainerProps,
  UpdateSupplierFormState,
  SelectBusinessStepProps,
} from "./dto";

import { BusinessProps } from "../../../dto";
import { SupplierProps } from "../dto";

import { useUpdateSupplierForm } from "./hooks";
import { useCepValidation } from "../../../hooks";

import { SearchBusiness } from "../../../search-business";
import { cn } from "@/lib/utils";

interface UpdateSupplierProps {
  supplierData: SupplierProps;
  handleCloseUpdateSupplier: () => void;
  isUpdateSupplierOpen: boolean;
}

// Step 1: Select Business
const SelectBusinessStep = ({
  searchBusinessInputValue,
  handleUpdateSearchBusinessInputValue,
  onContinue,
  errorBusinessId,
}: SelectBusinessStepProps) => {
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

      <SearchBusiness
        errorBusinessId={errorBusinessId}
        searchBusinessInputValue={searchBusinessInputValue}
        handleUpdateSearchBussinessInputValue={
          handleUpdateSearchBusinessInputValue
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

// Step 2: Update Supplier Form
const UpdateSupplierFormContainer = ({
  state,
  handleCloseUpdateSupplier,
  supplierData,
  isUpdateSupplierOpen,
  isDirty,
}: UpdateSupplierContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const {
    updatedFields: allFields,
    isDirty: hookIsDirty,
    cepLoading,
    handleFieldChange,
    formValues,
  } = useCepValidation({
    initialData: supplierData as Partial<BusinessProps>,
    isOpen: isUpdateSupplierOpen,
  });

  const isNameChanged =
    formValues?.hasOwnProperty("name") && formValues.name !== supplierData.name;

  const isAnyFieldDirty = hookIsDirty || isNameChanged || isDirty;

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

  const nameField: (typeof allFields)[0] = {
    label: "Nome do Fornecedor",
    htmlfor: "name",
    name: "name",
    type: "text",
    placeholder: "Digite o nome do fornecedor",
    value: formValues?.hasOwnProperty("name")
      ? formValues.name
      : supplierData.name || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleFieldChange("name", e.target.value),
    disabled: false,
    autoComplete: "organization",
  };

  const cnpjField = allFields.find((field) => field.name === "cnpj");
  const supplierFields: typeof allFields = [nameField];

  if (cnpjField) {
    supplierFields.push(cnpjField);
  }

  filteredFields
    .filter((field) => field.name !== "cnpj")
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
              ((state.updateSupplierError ?? {}) as Record<string, string[]>)[
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
          onClick={handleCloseUpdateSupplier}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || cepLoading || !isAnyFieldDirty}
        >
          <span>Editar Fornecedor</span>
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

const UpdateSupplierForm = ({
  supplierData,
  handleCloseUpdateSupplier,
  isUpdateSupplierOpen,
}: UpdateSupplierProps): JSX.Element => {
  const defaultState: UpdateSupplierFormState = {};
  const [state, dispatch] = useFormState(handleUpdateSupplier, null);

  const {
    formRef,
    currentStep,
    selectedBusiness,
    handleUpdateSearchBusinessInputValue,
    handleContinue,
    handleBack,
    isDirty,
    getBusinessIdError,
  } = useUpdateSupplierForm({
    state,
    handleCloseUpdateSupplier,
    supplierData,
    isUpdateSupplierOpen,
  });

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateSupplierOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateSupplier();
      }}
      open={isUpdateSupplierOpen}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : "Editar Fornecedor"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja editar o fornecedor."
              : "Insira as informações solicitadas abaixo para concluir a edição do fornecedor."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            searchBusinessInputValue={selectedBusiness.searchBusinessInputValue}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            onContinue={handleContinue}
            errorBusinessId={getBusinessIdError()}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData: FormData) => {
              const extraData = {
                businessId: selectedBusiness.businessId,
                supplierId: supplierData.id,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateSupplierFormContainer
              state={state ?? defaultState}
              handleCloseUpdateSupplier={handleBack}
              supplierData={supplierData}
              isUpdateSupplierOpen={isUpdateSupplierOpen}
              isDirty={isDirty}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateSupplierForm };
