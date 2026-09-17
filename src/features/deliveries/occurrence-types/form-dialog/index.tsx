"use client";

import { useMemo } from "react";
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

import { handleCreateOccurrenceType } from "@/actions/occurrence-type/create-occurrence-type";
import { handleUpdateOccurrenceType } from "@/actions/occurrence-type/update-occurrence-type";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";
import {
  useOccurrenceTypeForm,
  type OccurrenceTypeFormState,
} from "./hooks";

interface OccurrenceTypeFormDialogProps {
  businessId: string;
  /** When present the dialog edits; otherwise it creates. */
  occurrenceType: OccurrenceTypeData | null;
  isOpen: boolean;
  onClose: () => void;
}

const OccurrenceTypeFormDialogSubmit = ({
  state,
  occurrenceType,
  onClose,
  formRef,
  isOpen,
}: {
  state: OccurrenceTypeFormState;
  occurrenceType: OccurrenceTypeData | null;
  onClose: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isOpen: boolean;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isEditing = occurrenceType !== null;

  // Switches report as the string they submit; unchecked sends nothing.
  const initialValues = useMemo(
    () => ({
      name: occurrenceType?.name ?? "",
      description: occurrenceType?.description ?? "",
      requires_photo: occurrenceType?.requires_photo ? "true" : "",
      blocks_delivery: occurrenceType?.blocks_delivery ? "true" : "",
      is_active: occurrenceType?.is_active ? "true" : "",
    }),
    [occurrenceType],
  );

  const isDirty = useFormDirty({ formRef, initialValues, isOpen });

  const fieldErrors = (isEditing
    ? (state.updateOccurrenceTypeError ?? {})
    : (state.createOccurrenceTypeError ?? {})) as Record<string, string[]>;

  return (
    <>
      <div className="space-y-4 mt-5">
        <FormInput
          label="Nome do tipo *"
          htmlfor="name"
          name="name"
          type="text"
          defaultValue={occurrenceType?.name ?? ""}
          placeholder="Ex: Destinatário ausente"
          errorName={fieldErrors.name}
          disabled={pending}
        />

        <FieldShell
          label="Descrição (opcional)"
          htmlFor="description"
          error={fieldErrors.description}
        >
          {(control) => (
            <Textarea
              {...control}
              name="description"
            defaultValue={occurrenceType?.description ?? ""}
              placeholder="Quando o motorista deve usar este tipo de ocorrência"
              maxLength={300}
              disabled={pending}
            />
          )}
        </FieldShell>

        <div
          className="flex items-center justify-between
          rounded-lg border p-4"
        >
          <div className="space-y-0.5">
            <Label htmlFor="requires_photo">Exigir foto</Label>
            <p className="text-xs text-muted-foreground">
              O motorista precisará anexar foto ao registrar a ocorrência.
            </p>
          </div>
          <Switch
            id="requires_photo"
            name="requires_photo"
            value="true"
            defaultChecked={occurrenceType?.requires_photo ?? false}
            disabled={pending}
            aria-label="Alternar exigência de foto"
          />
        </div>

        <div
          className="flex items-center justify-between
          rounded-lg border p-4"
        >
          <div className="space-y-0.5">
            <Label htmlFor="blocks_delivery">Ocorrência impeditiva</Label>
            <p className="text-xs text-muted-foreground">
              Ao ser registrada, a entrega ativa passa para Insucesso.
            </p>
          </div>
          <Switch
            id="blocks_delivery"
            name="blocks_delivery"
            value="true"
            defaultChecked={occurrenceType?.blocks_delivery ?? false}
            disabled={pending}
            aria-label="Alternar ocorrência impeditiva"
          />
        </div>

        {isEditing && (
          <div
            className="flex items-center justify-between
            rounded-lg border p-4"
          >
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Tipo ativo</Label>
              <p className="text-xs text-muted-foreground">
                Inativo sai das opções do motorista; o histórico permanece.
              </p>
            </div>
            <Switch
              id="is_active"
              name="is_active"
              value="true"
              defaultChecked={occurrenceType.is_active}
              disabled={pending}
              aria-label="Alternar tipo ativo"
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
        >
          Cancelar
        </Button>
        {/* Same rule as every other update dialog: saving is only offered
        once something actually changed. */}
        <Button
          type="submit"
          disabled={pending || (isEditing && !isDirty)}
          className="flex-1"
        >
          <span>{isEditing ? "Salvar Tipo" : "Criar Tipo"}</span>
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

const OccurrenceTypeFormDialog = ({
  businessId,
  occurrenceType,
  isOpen,
  onClose,
}: OccurrenceTypeFormDialogProps): JSX.Element => {
  const isEditing = occurrenceType !== null;
  const defaultState: OccurrenceTypeFormState = {};

  const [state, dispatch] = useFormState<OccurrenceTypeFormState, FormData>(
    isEditing ? handleUpdateOccurrenceType : handleCreateOccurrenceType,
    defaultState,
  );

  const { formRef } = useOccurrenceTypeForm({ state, onClose });

  const submitOccurrenceTypeForm = (occurrenceTypeFormData: FormData) => {
    occurrenceTypeFormData.append("businessId", businessId);

    // Unchecked switches send nothing, so every "off" is spelled out.
    for (const toggle of ["requires_photo", "blocks_delivery"]) {
      if (!occurrenceTypeFormData.has(toggle)) {
        occurrenceTypeFormData.append(toggle, "false");
      }
    }

    if (isEditing) {
      occurrenceTypeFormData.append("occurrenceTypeId", occurrenceType.id);

      if (!occurrenceTypeFormData.has("is_active")) {
        occurrenceTypeFormData.append("is_active", "false");
      }
    }

    return dispatch(occurrenceTypeFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Tipo de Ocorrência" : "Criar Novo Tipo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            É o vocabulário de problemas da operação: o motorista escolhe um
            destes tipos ao reportar algo na entrega.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={submitOccurrenceTypeForm}>
          <OccurrenceTypeFormDialogSubmit
            state={state}
            occurrenceType={occurrenceType}
            onClose={onClose}
            formRef={formRef}
            isOpen={isOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { OccurrenceTypeFormDialog };
