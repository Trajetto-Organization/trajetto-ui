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
import type { BusinessProps } from "@/app/(protected)/_components/shared/common.types";

import { handleCreateBranch } from "@/actions/branch/create-branch";
import { handleUpdateBranch } from "@/actions/branch/update-branch";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateBranchSchema } from "@/schemas/create-update-branch-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { refreshAfterBranchWrite } from "../lib/after-write";
import type { BranchRow } from "../lib/server-table";

type FieldErrors = Record<string, string[] | string | undefined>;

interface BranchFormState {
  createBranchError?: FieldErrors & { createBranchErrorMessage?: string };
  updateBranchError?: FieldErrors & { updateBranchErrorMessage?: string };
  successMessage?: string;
}

interface BranchFieldsProps {
  isOpen: boolean;
  branch?: BranchRow;
  errors: FieldErrors;
  submitLabel: string;
}

/** Inside the <form>, so useFormStatus sees the submit. */
const BranchFields = ({
  isOpen,
  branch,
  errors,
  submitLabel,
}: BranchFieldsProps): JSX.Element => {
  const { pending } = useFormStatus();

  const initialData = useMemo(
    () => (branch ?? {}) as unknown as Partial<BusinessProps>,
    [branch],
  );

  // Address fields with the CEP lookup, and the dirty state of the edit
  // (decision 2.5: Salvar only once something changed).
  const { updatedFields, cepLoading, isDirty, formValues } = useCepValidation({
    isOpen,
    initialData,
  });

  const isEdit = Boolean(branch);

  // Live validation (decision 16.700): the action's schema over the values
  // the form posts (masked, as the schema's preprocess expects them).
  const live = useLiveValidation({
    schema: createUpdateBranchSchema,
    values: formValues,
    serverErrors: errors,
    resetKey: isOpen,
  });

  return (
    <>
      <div
        ref={live.ref}
        className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {updatedFields.map((field) => (
          <FormInput
            key={field.name}
            {...field}
            errorName={live.errorOf(field.name)}
            disabled={field.disabled || pending}
          />
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

interface BranchFormDialogProps {
  /** The company the branch belongs to: the page's, or the row's. */
  businessId: string;
  /** Absent to create; the row to edit. */
  branch?: BranchRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Create and edit a branch: one dialog for /admin and /dashboard
 * (decision 8.7), in one step.
 *
 * The company is never a field: the admin copy asked for it in a first step
 * (with a "Voltar" a single-step dialog does not have, decision 3.2). Name,
 * e-mail and ERP code are unique inside the company and the CNPJ nationally;
 * a conflict comes back as the API's sentence, which never names another
 * carrier.
 */
const BranchFormDialog = ({
  businessId,
  branch,
  isOpen,
  onClose,
}: BranchFormDialogProps): JSX.Element => {
  const isEdit = Boolean(branch);

  const [state, dispatch] = useFormState<BranchFormState, FormData>(
    guardFormAction(isEdit ? handleUpdateBranch : handleCreateBranch),
    {},
  );

  const handledRef = useRef<BranchFormState | null>(null);

  const errors = ((isEdit
    ? state.updateBranchError
    : state.createBranchError) ?? {}) as FieldErrors;

  useEffect(() => {
    if (!state || handledRef.current === state) return;

    handledRef.current = state;

    const message = isEdit
      ? state.updateBranchError?.updateBranchErrorMessage
      : state.createBranchError?.createBranchErrorMessage;

    if (message) {
      toast.error(message);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterBranchWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
    // One result, answered once; onClose is the parent's setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const submit = (formData: FormData) => {
    formData.set("businessId", businessId);
    if (branch) formData.set("branchId", branch.id);

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
            {isEdit ? "Editar Filial" : "Criar Filial"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os dados da filial e salve."
              : "Razão social, e-mail e código ERP não se repetem dentro da empresa."}
          </DialogDescription>
        </DialogHeader>

        <form action={submit} noValidate data-branch-form>
          <BranchFields
            isOpen={isOpen}
            branch={branch}
            errors={errors}
            submitLabel={isEdit ? "Salvar Alterações" : "Criar Filial"}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { BranchFormDialog };
