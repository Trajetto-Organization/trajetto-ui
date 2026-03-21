import { useMemo } from "react";

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
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateSupplier } from "@/actions/supplier/update-supplier";
import { appendDataToForm } from "@/lib/append-data-form";

import { SelectBusinessStep } from "@/app/(protected)/_components/shared/steps/select-business-step";
import type {
  UpdateSupplierFormSubmitProps,
  UpdateSupplierFormState,
} from "./update-supplier-form.types";

import type { BusinessProps } from "@/app/(protected)/_components/shared/common.types";
import type { SupplierProps } from "../supplier.types";

import { useCepValidation } from "@/app/(protected)/_components/hooks";
import { useUpdateSupplierForm } from "./hooks";

interface UpdateSupplierProps {
  supplierData: SupplierProps;
  handleCloseUpdateSupplier: () => void;
  isUpdateSupplierOpen: boolean;
}

const UpdateSupplierFormSubmit = ({
  state,
  handleCloseUpdateSupplier,
  supplierData,
  isUpdateSupplierOpen,
  isDirty,
  initialFormValues,
  onFormValuesChange,
}: UpdateSupplierFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Merge supplierData with initialFormValues (persisted values take precedence)
  // Use useMemo to prevent creating a new object on every render (which causes infinite loops)
  const mergedInitialData = useMemo(() => {
    // If there are persisted values, merge them with supplierData
    if (Object.keys(initialFormValues).length > 0) {
      return {
        ...supplierData,
        ...initialFormValues,
      } as Partial<BusinessProps>;
    }
    // Otherwise, just use supplierData
    return supplierData as Partial<BusinessProps>;
  }, [supplierData, initialFormValues]);

  const {
    updatedFields: allFields,
    isDirty: hookIsDirty,
    cepLoading,
    handleFieldChange,
    formValues,
  } = useCepValidation({
    initialData: mergedInitialData,
    isOpen: isUpdateSupplierOpen,
    originalData: supplierData as Partial<BusinessProps>,
  });

  // Save form values when going back
  const handleBack = () => {
    onFormValuesChange(formValues);
    handleCloseUpdateSupplier();
  };

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
    label: "Nome do Fornecedor *",
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
          onClick={handleBack}
          disabled={pending || cepLoading}
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
  const [state, dispatch] = useFormState<UpdateSupplierFormState, FormData>(
    handleUpdateSupplier,
    defaultState,
  );

  const {
    formRef,
    currentStep,
    selectedBusiness,
    handleUpdateSearchBusinessInputValue,
    handleContinue,
    handleBack,
    isDirty,
    getBusinessIdError,
    supplierFormValues,
    handleFormValuesChange,
  } = useUpdateSupplierForm({
    state,
    handleCloseUpdateSupplier,
    supplierData,
    isUpdateSupplierOpen,
  });

  const updateSupplierForm = (supplierFormData: FormData) => {
    const updateSupplierData = {
      businessId: selectedBusiness.businessId,
      supplierId: supplierData.id,
    };

    appendDataToForm(supplierFormData, updateSupplierData);
    return dispatch(supplierFormData);
  };

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
      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
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
            commandBusinessInputValue={selectedBusiness}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            onContinue={handleContinue}
            errorBusinessId={getBusinessIdError()}
          />
        ) : (
          <form ref={formRef} action={updateSupplierForm}>
            <UpdateSupplierFormSubmit
              state={state}
              handleCloseUpdateSupplier={handleBack}
              supplierData={supplierData}
              isUpdateSupplierOpen={isUpdateSupplierOpen}
              isDirty={isDirty}
              initialFormValues={supplierFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateSupplierForm };
