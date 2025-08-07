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

import { handleCreateSupplier } from "@/actions/create-supplier";
import {
  DashboardCreateSupplierContainerProps,
  DashboardCreateSupplierFormState,
} from "./dto";

import { useCepValidation } from "../../../hooks";
import { useDashboardCreateSupplierForm } from "./hooks";

import { useAuthStore } from "@/store/auth-store";
import { permissions } from "@/lib/permissions";

import { useHasPermission } from "@/lib/user-has-permission";

const CreateSupplierFormContainer = ({
  state,
  isCreateSupplierForm,
  handleOpenCreateSupplierForm,
}: DashboardCreateSupplierContainerProps): JSX.Element => {
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
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateSupplierForm}
        >
          Cancelar
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

const DashboardCreateSupplierForm = (): JSX.Element => {
  const defaultState: DashboardCreateSupplierFormState = {};
  const [state, dispatch] = useFormState(handleCreateSupplier, null);

  const {
    isCreateSupplierForm,
    formRef,
    handleCloseDialog,
    handleOpenCreateSupplierForm,
  } = useDashboardCreateSupplierForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(
    permissions.SUPPLIER_MANAGE,
    "write",
  );

  return (
    <Dialog open={isCreateSupplierForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
        <Button size="sm" className="h-8">
          Criar Fornecedor
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo Fornecedor</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            fornecedor.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData) => {
            formData.append("businessId", businessId as string);
            dispatch(formData);
          }}
        >
          <CreateSupplierFormContainer
            isCreateSupplierForm={isCreateSupplierForm}
            handleOpenCreateSupplierForm={handleOpenCreateSupplierForm}
            state={state ?? defaultState}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateSupplierForm };
