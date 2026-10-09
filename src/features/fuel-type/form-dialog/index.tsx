"use client";

import { useEffect, useRef, useState } from "react";
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

import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { handleCreateFuelType } from "@/actions/fuel-type/create-fuel-type";
import { handleUpdateFuelType } from "@/actions/fuel-type/update-fuel-type";
import {
  allowedFuelTypes,
  createUpdateFuelTypeSchema,
} from "@/schemas/create-update-fuel-type-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { guardFormAction } from "@/lib/action-result";

import { refreshAfterFuelTypeWrite } from "../lib/after-write";
import type { FuelTypeRow } from "../lib/types";

interface FuelTypeFormState {
  createFuelTypeError?: {
    description?: string[];
    createFuelTypeErrorMessage?: string;
  };
  updateFuelTypeError?: {
    description?: string[];
    updateFuelTypeErrorMessage?: string;
  };
  successMessage?: string;
}

interface FuelTypeFieldsProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  error?: string[];
  submitLabel: string;
  canSubmit: boolean;
}

/** Inside the <form>, so useFormStatus sees the submit. */
const FuelTypeFields = ({
  description,
  onDescriptionChange,
  error,
  submitLabel,
  canSubmit,
}: FuelTypeFieldsProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="mt-2 space-y-6">
      <SelectField
        name="description"
        label="Combustível *"
        placeholder="Tipo do combustível"
        htmlfor="description"
        options={allowedFuelTypes.map((fuel) => ({ label: fuel, value: fuel }))}
        disabled={pending}
        value={description}
        onChange={onDescriptionChange}
        errorName={error}
      />

      {/* A small modal: Cancelar + the action side by side (decision 3.2). */}
      <DialogFormFooter>
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
        <Button type="submit" disabled={pending || !canSubmit}>
          <span>{submitLabel}</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

interface FuelTypeFormDialogProps {
  /** The company the fuel type belongs to: the page's, or the row's. */
  businessId: string;
  /** Absent to create; the row to edit. */
  fuelType?: FuelTypeRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Create and edit a fuel type, one dialog for /admin and /dashboard.
 *
 * The company is never a field: /admin takes it from the selector at the
 * top, the dashboard from the session, an edit from the row. The admin copy
 * had a company search inside the form, and saving an edit with another
 * company picked moved the fuel type — with its vehicles and refuelings —
 * into that company. Save is disabled until something changed (2.5);
 * Criar is always enabled and explains what is missing (16.700, 16.701).
 */
const FuelTypeFormDialog = ({
  businessId,
  fuelType,
  isOpen,
  onClose,
}: FuelTypeFormDialogProps): JSX.Element => {
  const isEdit = Boolean(fuelType);

  const [state, dispatch] = useFormState<FuelTypeFormState, FormData>(
    guardFormAction(isEdit ? handleUpdateFuelType : handleCreateFuelType),
    {},
  );

  const [description, setDescription] = useState<string>(
    fuelType?.description ?? "",
  );

  const handledRef = useRef<FuelTypeFormState | null>(null);

  const errors = isEdit ? state.updateFuelTypeError : state.createFuelTypeError;

  useEffect(() => {
    if (!state || handledRef.current === state) return;

    handledRef.current = state;

    const message = isEdit
      ? state.updateFuelTypeError?.updateFuelTypeErrorMessage
      : state.createFuelTypeError?.createFuelTypeErrorMessage;

    if (message) {
      toast.error(message);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterFuelTypeWrite(
        isEdit ? "update-fuel-type" : "create-fuel-type",
      ).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
    // One result, answered once; onClose is the parent's setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const live = useLiveValidation({
    schema: createUpdateFuelTypeSchema,
    values: { description },
    // The company is the page's, never a field of the form.
    fields: ["description"],
    serverErrors: errors,
  });

  const submit = (formData: FormData) => {
    if (!live.isValid()) return;

    formData.set("businessId", businessId);
    if (fuelType) formData.set("fuelTypeId", fuelType.id);

    return dispatch(formData);
  };

  const canSubmit = canSubmitForm({
    isEdit,
    isDirty: description !== (fuelType?.description ?? ""),
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogScrollContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit
              ? "Editar Tipo de Combustível"
              : "Criar Tipo de Combustível"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Troque o combustível e salve."
              : "Escolha o combustível que a frota da empresa usa."}
          </DialogDescription>
        </DialogHeader>

        <form ref={live.ref} action={submit} noValidate>
          <FuelTypeFields
            description={description}
            onDescriptionChange={(value) => {
              setDescription(value);
              // A pick is a complete answer: no blur needed to judge it.
              live.touch("description");
            }}
            error={live.errorOf("description")}
            submitLabel={isEdit ? "Salvar Alterações" : "Criar Combustível"}
            canSubmit={canSubmit}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { FuelTypeFormDialog };
