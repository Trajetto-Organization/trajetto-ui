"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import { useFormDirty } from "@/hooks/use-form-dirty";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import FormInput from "@/components/shared/custom/form-input";

import { handleCreateStatusChangeReason } from "@/actions/status-change-reason/create-status-change-reason";
import { handleUpdateStatusChangeReason } from "@/actions/status-change-reason/update-status-change-reason";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";
import {
  useStatusChangeReasonForm,
  type StatusChangeReasonFormState,
} from "./hooks";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateStatusChangeReasonSchema } from "@/schemas/create-update-status-change-reason-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

interface StatusChangeReasonFormDialogProps {
  businessId: string;
  /** When present the dialog edits; otherwise it creates. */
  reason: StatusChangeReasonData | null;
  isOpen: boolean;
  onClose: () => void;
}

const StatusChangeReasonFormDialogSubmit = ({
  state,
  reason,
  onClose,
  formRef,
  isOpen,
}: {
  state: StatusChangeReasonFormState;
  reason: StatusChangeReasonData | null;
  onClose: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isOpen: boolean;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isEditing = reason !== null;

  // Switches report as the string they submit; unchecked sends nothing.
  const initialValues = useMemo(
    () => ({
      name: reason?.name ?? "",
      description: reason?.description ?? "",
      is_active: reason?.is_active ? "true" : "",
    }),
    [reason],
  );

  const isDirty = useFormDirty({ formRef, initialValues, isOpen });

  const fieldErrors = (
    isEditing
      ? (state.updateStatusChangeReasonError ?? {})
      : (state.createStatusChangeReasonError ?? {})
  ) as Record<string, string[]>;

  // Controlled, so live validation reads them.
  const [name, setName] = useState<string>(reason?.name ?? "");
  const [description, setDescription] = useState<string>(
    reason?.description ?? "",
  );

  // Live validation (decision 16.700) with the action's own schema.
  const live = useLiveValidation({
    schema: createUpdateStatusChangeReasonSchema,
    values: { name, description },
    fields: ["name", "description"],
    serverErrors: fieldErrors,
  });

  return (
    <>
      <div ref={live.ref} className="space-y-4 mt-5">
        <FormInput
          label="Nome do motivo *"
          htmlfor="name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Ex: Cliente cancelou por telefone"
          errorName={live.errorOf("name")}
          disabled={pending}
        />

        <FieldShell
          label="Descrição (opcional)"
          htmlFor="description"
          error={live.errorOf("description")}
        >
          {(control) => (
            <Textarea
              {...control}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="Quando usar este motivo — aparece como ajuda no seletor"
              maxLength={255}
              disabled={pending}
            />
          )}
        </FieldShell>

        {isEditing && (
          <div
            className="flex items-center justify-between
            rounded-lg border p-4"
          >
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Motivo ativo</Label>
              <p className="text-xs text-muted-foreground">
                Inativo sai do seletor e continua explicando as mudanças que já
                o citam. É assim que um motivo sai do vocabulário.
              </p>
            </div>
            <Switch
              id="is_active"
              name="is_active"
              value="true"
              defaultChecked={reason.is_active}
              disabled={pending}
              aria-label="Alternar motivo ativo"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-6 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>

        {/* Same rule as every other update dialog: saving is only offered
        once something actually changed. */}
        <Button
          type="submit"
          disabled={pending || !canSubmitForm({ isEdit: isEditing, isDirty })}
          className="flex-1"
        >
          <span>{isEditing ? "Salvar Motivo" : "Criar Motivo"}</span>
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

const StatusChangeReasonFormDialog = ({
  businessId,
  reason,
  isOpen,
  onClose,
}: StatusChangeReasonFormDialogProps): JSX.Element => {
  const isEditing = reason !== null;
  const defaultState: StatusChangeReasonFormState = {};

  const [state, dispatch] = useFormState<StatusChangeReasonFormState, FormData>(
    guardFormAction(
      isEditing
        ? handleUpdateStatusChangeReason
        : handleCreateStatusChangeReason,
    ),
    defaultState,
  );

  const { formRef } = useStatusChangeReasonForm({ state, onClose });

  const submitReasonForm = (reasonFormData: FormData) => {
    reasonFormData.append("businessId", businessId);

    if (isEditing) {
      reasonFormData.append("reasonId", reason.id);

      // Unchecked switches send nothing, so "off" is spelled out.
      if (!reasonFormData.has("is_active")) {
        reasonFormData.append("is_active", "false");
      }
    }

    return dispatch(reasonFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Motivo" : "Criar Novo Motivo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            É o vocabulário da empresa para explicar por que uma entrega mudou
            de status pelo painel. Curto de propósito: ele aparece num seletor e
            numa linha do histórico, e é por ele que se agrupa e se conta.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={submitReasonForm}
          noValidate
          data-status-reason-form
        >
          <StatusChangeReasonFormDialogSubmit
            state={state}
            reason={reason}
            onClose={onClose}
            formRef={formRef}
            isOpen={isOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { StatusChangeReasonFormDialog };
