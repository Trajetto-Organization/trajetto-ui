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

import { handleUpdateSupplier } from "@/actions/supplier/update-supplier";
import { appendDataToForm } from "@/lib/append-data-form";

import {
  DashboardUpdateSupplierSubmitProps,
  DashboardUpdateSupplierFormState,
} from "./dto";

import { DashboardSupplierProps } from "../dto";
import { BusinessProps } from "../../../dto";

import { useDashboardUpdateSupplierForm } from "./hooks";
import { useCepValidation } from "../../../hooks";

import { useAuthStore } from "@/store/auth-store";

interface DashboardUpdateSupplierProps {
  supplierData: DashboardSupplierProps;
  handleCloseUpdateSupplier: () => void;
  isUpdateSupplierOpen: boolean;
}

const DashboardUpdateSupplierFormSubmit = ({
  state,
  handleCloseUpdateSupplier,
  supplierData,
  isUpdateSupplierOpen,
}: DashboardUpdateSupplierSubmitProps): JSX.Element => {
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

  const isDirty = hookIsDirty || isNameChanged;

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
          onClick={handleCloseUpdateSupplier}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || cepLoading || !isDirty}>
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

const DashboardUpdateSupplierForm = ({
  supplierData,
  handleCloseUpdateSupplier,
  isUpdateSupplierOpen,
}: DashboardUpdateSupplierProps): JSX.Element => {
  const defaultState: DashboardUpdateSupplierFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateSupplierFormState,
    FormData
  >(handleUpdateSupplier, defaultState);

  const { formRef } = useDashboardUpdateSupplierForm({
    state,
    handleCloseUpdateSupplier,
  });

  const { businessId } = useAuthStore();

  const updateSupplierForm = (supplierFormData: FormData) => {
    const updateSupplierData = {
      businessId: businessId as string,
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
          <DialogTitle className="text-xl">Editar Fornecedor</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            fornecedor.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateSupplierForm}>
          <DashboardUpdateSupplierFormSubmit
            state={state}
            handleCloseUpdateSupplier={handleCloseUpdateSupplier}
            supplierData={supplierData}
            isUpdateSupplierOpen={isUpdateSupplierOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateSupplierForm };
