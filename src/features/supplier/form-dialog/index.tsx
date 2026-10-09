"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { useCepValidation } from "@/app/(protected)/_components/hooks";
import type {
  BusinessProps,
  FieldProps,
} from "@/app/(protected)/_components/shared/common.types";

import { handleCreateSupplier } from "@/actions/supplier/create-supplier";
import { handleUpdateSupplier } from "@/actions/supplier/update-supplier";
import { createUpdateSupplierSchema } from "@/schemas/create-update-supplier-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { guardFormAction } from "@/lib/action-result";

import { refreshAfterSupplierWrite } from "../lib/after-write";
import type { SupplierRow } from "../lib/server-table";

import { supplierFieldLayout } from "./fields";

interface SupplierFormState {
  createSupplierError?: Record<string, string[] | string | undefined> & {
    createSupplierErrorMessage?: string;
  };
  updateSupplierError?: Record<string, string[] | string | undefined> & {
    updateSupplierErrorMessage?: string;
  };
  successMessage?: string;
}

interface SupplierFieldsProps {
  isOpen: boolean;
  supplier?: SupplierRow;
  errors: Record<string, string[] | string | undefined>;
  submitLabel: string;
}

/** Inside the <form>, so useFormStatus sees the submit. */
const SupplierFields = ({
  isOpen,
  supplier,
  errors,
  submitLabel,
}: SupplierFieldsProps): JSX.Element => {
  const { pending } = useFormStatus();

  const initialData = useMemo(
    () => (supplier ?? {}) as unknown as Partial<BusinessProps>,
    [supplier],
  );

  // Address fields with the CEP lookup, and the dirty state of the edit
  // (decision 2.5: Salvar only once something changed).
  const { updatedFields, cepLoading, handleFieldChange, formValues, isDirty } =
    useCepValidation({ isOpen, initialData });

  const fields = supplierFieldLayout({
    addressFields: updatedFields,
    name: formValues.name ?? "",
    onNameChange: (value) => handleFieldChange("name", value),
  });

  const isEdit = Boolean(supplier);

  // Live validation (decision 16.700) here, where the values live (the CEP
  // hook); the ref on the grid still reads the enclosing form's submit.
  // The CEP hook only seeds `name` from initialData, so on create it is
  // undefined until typed; validate it as the empty string the input shows.
  const liveValues = useMemo(
    () => ({ ...formValues, name: formValues.name ?? "" }),
    [formValues],
  );

  const live = useLiveValidation({
    schema: createUpdateSupplierSchema,
    values: liveValues,
    fields: fields.map((field) => field.name),
    serverErrors: errors,
  });

  return (
    <>
      {/* One column on a phone, two from `md`; the name spans both. */}
      <div
        ref={live.ref}
        className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {fields.map((field: FieldProps) => (
          <div
            key={field.name}
            className={field.name === "name" ? "md:col-span-2" : undefined}
          >
            <FormInput
              {...field}
              errorName={live.errorOf(field.name)}
              disabled={field.disabled || pending}
            />
          </div>
        ))}
      </div>

      {/* A wide modal: the buttons go to the right (decision 3.2). */}
      <DialogFormFooter className="mt-6">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={
            pending || cepLoading || !canSubmitForm({ isEdit, isDirty })
          }
        >
          <span>{submitLabel}</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </>
  );
};

interface SupplierFormDialogProps {
  /** The company the supplier belongs to: the page's, or the row's. */
  businessId: string;
  /** Absent to create; the row to edit. */
  supplier?: SupplierRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Create and edit a supplier: one dialog for /admin and /dashboard
 * (decision 8.7), in one step.
 *
 * The company is never a field. The admin copies asked for it in a first
 * step, and editing with another company picked MOVED the supplier there —
 * its parts and service orders stayed behind, linked across tenants (the API
 * now refuses that too). Conflicts (same name, CNPJ or e-mail in this
 * company) come back as the API's sentence.
 */
const SupplierFormDialog = ({
  businessId,
  supplier,
  isOpen,
  onClose,
}: SupplierFormDialogProps): JSX.Element => {
  const isEdit = Boolean(supplier);

  const [state, dispatch] = useFormState<SupplierFormState, FormData>(
    guardFormAction(isEdit ? handleUpdateSupplier : handleCreateSupplier),
    {},
  );

  const handledRef = useRef<SupplierFormState | null>(null);

  const errors = ((isEdit
    ? state.updateSupplierError
    : state.createSupplierError) ?? {}) as Record<
    string,
    string[] | string | undefined
  >;

  useEffect(() => {
    if (!state || handledRef.current === state) return;

    handledRef.current = state;

    const message = isEdit
      ? state.updateSupplierError?.updateSupplierErrorMessage
      : state.createSupplierError?.createSupplierErrorMessage;

    if (message) {
      toast.error(message);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterSupplierWrite(
        isEdit ? "update-supplier" : "create-supplier",
      ).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
    // One result, answered once; onClose is the parent's setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const submit = (formData: FormData) => {
    formData.set("businessId", businessId);
    if (supplier) formData.set("supplierId", supplier.id);

    return dispatch(formData);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogScrollContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? "Editar Fornecedor" : "Criar Fornecedor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os dados do fornecedor e salve."
              : "Oficina, loja ou prestador da empresa. Nome, CNPJ e e-mail não se repetem dentro da empresa."}
          </DialogDescription>
        </DialogHeader>

        <form action={submit} noValidate>
          <SupplierFields
            isOpen={isOpen}
            supplier={supplier}
            errors={errors}
            submitLabel={isEdit ? "Salvar Alterações" : "Criar Fornecedor"}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { SupplierFormDialog };
