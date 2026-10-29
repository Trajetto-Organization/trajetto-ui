"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useQuery } from "react-query";

import { Loader } from "lucide-react";
import { useFormDirty } from "@/hooks/use-form-dirty";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import FormInput from "@/components/shared/custom/form-input";

import { handleCreateOccurrenceType } from "@/actions/occurrence-type/create-occurrence-type";
import { handleUpdateOccurrenceType } from "@/actions/occurrence-type/update-occurrence-type";
import { fetchAIUsage } from "@/lib/business-reads";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";
import { useOccurrenceTypeForm, type OccurrenceTypeFormState } from "./hooks";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateOccurrenceTypeSchema } from "@/schemas/create-update-occurrence-type-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { OccurrenceFormBuilder } from "../form-builder";
import {
  definitionFromDrafts,
  draftsFromDefinition,
  type DraftField,
} from "../form-builder/builder-rules";
import { normalizeFormFields, readFormFields } from "../form-builder/rules";
import type { OccurrenceCategoryKey, PauseKindKey } from "../category-rules";
import {
  CATEGORY_OPTIONS,
  CATEGORY_TOGGLES,
  LEGACY_APP_NOTICE,
  PAUSE_KIND_HELP,
  PAUSE_KIND_OPTIONS,
  RECEIPT_AI_NOTE,
  categoryLockReason,
  receiptAiWarning,
  receiptPhotoDefault,
  sectionsFor,
  showsLegacyAppNotice,
  toggleValues,
  type CategoryToggle,
} from "./category-form";

interface OccurrenceTypeFormDialogProps {
  businessId: string;
  /** When present the dialog edits; otherwise it creates. */
  occurrenceType: OccurrenceTypeData | null;
  isOpen: boolean;
  onClose: () => void;
}

/** One switch row of the dialog: label, help and the switch itself. */
const ToggleRow = ({
  name,
  label,
  help,
  defaultChecked,
  disabled,
  ariaLabel,
  warning,
}: {
  name: CategoryToggle | "is_active";
  label: string;
  help: string;
  defaultChecked: boolean;
  disabled: boolean;
  ariaLabel: string;
  /** A second line under the help, as a warning. */
  warning?: string | null;
}): JSX.Element => (
  <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
    <div className="space-y-0.5">
      <Label htmlFor={name}>{label}</Label>
      <p className="text-xs text-muted-foreground">{help}</p>
      {warning && (
        <p className="text-xs text-amber-800 dark:text-amber-300">{warning}</p>
      )}
    </div>
    <Switch
      id={name}
      name={name}
      value="true"
      defaultChecked={defaultChecked}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  </div>
);

/** The stored form as the comparison string (no form = ""). */
function formSignature(fields: ReturnType<typeof normalizeFormFields>): string {
  return fields ? JSON.stringify(fields) : "";
}

const OccurrenceTypeFormDialogSubmit = ({
  state,
  occurrenceType,
  onClose,
  formRef,
  isOpen,
  businessId,
}: {
  state: OccurrenceTypeFormState;
  occurrenceType: OccurrenceTypeData | null;
  onClose: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isOpen: boolean;
  businessId: string;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isEditing = occurrenceType !== null;

  // Decision 14.3: the category decides which requirements exist at all.
  const [category, setCategory] = useState<OccurrenceCategoryKey>(
    occurrenceType?.category ?? "NOT_DELIVERED",
  );
  const [pauseKind, setPauseKind] = useState<PauseKindKey | null>(
    occurrenceType?.pause_kind ?? null,
  );

  const sections = sectionsFor(category);
  const lockReason = categoryLockReason(occurrenceType);

  // Design §7.2: without the AI module the receipt only reaches the human
  // audit. Read only while the receipt switch is on screen; a failed read
  // shows no warning rather than a wrong one.
  const aiUsage = useQuery(
    ["ai-usage", businessId],
    ({ signal }) =>
      fetchAIUsage(businessId, { signal }).then(
        (usage) => usage?.ai_analysis_limit ?? null,
        () => null,
      ),
    {
      enabled: isOpen && sections.receiptPhoto && businessId !== "",
      staleTime: 5 * 60_000,
    },
  );
  const receiptWarning = receiptAiWarning(aiUsage.data);

  // The builder edits strings; what is compared and sent is the definition
  // the API would store (normalized), so reordering back or retyping the
  // same label is not a change.
  const [drafts, setDrafts] = useState<DraftField[]>(() =>
    draftsFromDefinition(occurrenceType?.form_fields ?? null),
  );

  const verdict = useMemo(() => definitionFromDrafts(drafts), [drafts]);

  const initialForm = useMemo(
    () => formSignature(readFormFields(occurrenceType?.form_fields ?? null)),
    [occurrenceType],
  );

  const currentForm = verdict.valid
    ? formSignature(verdict.fields)
    : JSON.stringify(drafts);

  // Switches report as the string they submit; unchecked sends nothing.
  const initialValues = useMemo(
    () => ({
      name: occurrenceType?.name ?? "",
      description: occurrenceType?.description ?? "",
      requires_photo: occurrenceType?.requires_photo ? "true" : "",
      blocks_delivery: occurrenceType?.blocks_delivery ? "true" : "",
      requires_authorization: occurrenceType?.requires_authorization
        ? "true"
        : "",
      requires_receipt_photo: occurrenceType?.requires_receipt_photo
        ? "true"
        : "",
      requires_signature: occurrenceType?.requires_signature ? "true" : "",
      is_active: occurrenceType?.is_active ? "true" : "",
    }),
    [occurrenceType],
  );

  const isDirty = useFormDirty({
    formRef,
    initialValues,
    isOpen,
    extraValues: [
      [currentForm, initialForm],
      [category, occurrenceType?.category ?? "NOT_DELIVERED"],
      [pauseKind ?? "", occurrenceType?.pause_kind ?? ""],
    ],
  });

  // A pause without its nature cannot be saved; everything else the matrix
  // refuses is hidden by the sections, so this is the one visible issue.
  const pauseKindMissing = category === "PAUSE" && pauseKind === null;

  const fieldErrors = (
    isEditing
      ? (state.updateOccurrenceTypeError ?? {})
      : (state.createOccurrenceTypeError ?? {})
  ) as Record<string, string[]>;

  // Controlled, so live validation reads them.
  const [name, setName] = useState<string>(occurrenceType?.name ?? "");
  const [description, setDescription] = useState<string>(
    occurrenceType?.description ?? "",
  );

  // Live validation (decision 16.700): the action's schema for the texts;
  // the pause's nature and the driver's form as the dialog's own rules
  // (the builder's verdict is the API's form rules).
  const live = useLiveValidation({
    schema: createUpdateOccurrenceTypeSchema,
    values: { name, description },
    rules: () => ({
      pause_kind: pauseKindMissing
        ? "Escolha a natureza legal da pausa (refeição, descanso ou outra)."
        : null,
      form_fields:
        sections.form && !verdict.valid
          ? (verdict.formError ??
            "Corrija as perguntas marcadas do formulário do motorista.")
          : null,
    }),
    fields: ["name", "description", "pause_kind", "form_fields"],
    serverErrors: fieldErrors,
  });

  // The questions' own messages wait like any field: until the builder is
  // left once, or a submit.
  const showBuilderErrors = live.messageOf("form_fields") !== null;

  return (
    <>
      <div ref={live.ref} className="space-y-4 mt-5">
        <FormInput
          label="Nome do tipo *"
          htmlfor="name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Ex: Destinatário ausente"
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
              placeholder="Quando o motorista deve usar este tipo de ocorrência"
              maxLength={300}
              disabled={pending}
            />
          )}
        </FieldShell>

        {/* Decision 14.3: Entrega / Não entrega / Pausa. Locked once the
            type was used, and on the platform's defaults. */}
        <FieldShell
          label="Categoria *"
          htmlFor="category"
          // A radiogroup is not labelable: the group names itself below.
          labelTargetsControl={false}
          hint={lockReason ?? undefined}
          error={fieldErrors.category}
        >
          {(control) => (
            <div className="space-y-2">
              <RadioGroup
                {...control}
                value={category}
                onValueChange={(value) => {
                  setCategory(value as OccurrenceCategoryKey);
                  if (value !== "PAUSE") setPauseKind(null);
                }}
                disabled={pending || lockReason !== null}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                aria-label="Categoria do tipo"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`category-${option.value}`}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border p-3
                    has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70
                    has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`category-${option.value}`}
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="block font-medium">{option.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {option.hint}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}
        </FieldShell>

        <input type="hidden" name="category" value={category} />
        <input
          type="hidden"
          name="pause_kind"
          value={category === "PAUSE" ? (pauseKind ?? "") : ""}
        />

        {showsLegacyAppNotice(occurrenceType) && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {LEGACY_APP_NOTICE}
          </p>
        )}

        {sections.pauseKind && (
          <FieldShell
            label="Natureza legal *"
            htmlFor="pause_kind_group"
            labelTargetsControl={false}
            hint={PAUSE_KIND_HELP}
            error={live.errorOf("pause_kind")}
          >
            {(control) => (
              // The options' ids are their own: the wrapper names the field.
              <div className="space-y-2" data-live-field="pause_kind">
                <RadioGroup
                  {...control}
                  value={pauseKind ?? ""}
                  onValueChange={(value) => {
                    setPauseKind(value as PauseKindKey);
                    // A choice is a complete answer.
                    live.touch("pause_kind");
                  }}
                  disabled={pending || lockReason !== null}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  aria-label="Natureza legal da pausa"
                >
                  {PAUSE_KIND_OPTIONS.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`pause-kind-${option.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`pause-kind-${option.value}`}
                      />
                      {option.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}
          </FieldShell>
        )}

        {sections.receiptPhoto && (
          <ToggleRow
            // Remounted per category: the switch is uncontrolled, and its
            // default follows the category (receiptPhotoDefault).
            key={`receipt-${category}`}
            name="requires_receipt_photo"
            label="Exigir foto do canhoto"
            help={`Só pela câmera do aplicativo. ${RECEIPT_AI_NOTE}`}
            warning={receiptWarning}
            defaultChecked={receiptPhotoDefault(occurrenceType, category)}
            disabled={pending}
            ariaLabel="Alternar exigência da foto do canhoto"
          />
        )}

        {sections.signature && (
          <ToggleRow
            name="requires_signature"
            label="Exigir assinatura na tela"
            help={
              category === "DELIVERED"
                ? "O quadro de assinatura é sempre oferecido; ligado, ele passa a ser obrigatório."
                : "Quem recebeu assina na tela do aplicativo."
            }
            defaultChecked={occurrenceType?.requires_signature ?? false}
            disabled={pending}
            ariaLabel="Alternar exigência de assinatura"
          />
        )}

        {sections.photos && (
          <ToggleRow
            name="requires_photo"
            label={
              category === "DELIVERED"
                ? "Exigir fotos adicionais"
                : "Exigir foto"
            }
            help="O motorista precisará anexar foto ao registrar."
            defaultChecked={occurrenceType?.requires_photo ?? false}
            disabled={pending}
            ariaLabel="Alternar exigência de foto"
          />
        )}

        {sections.blocking && (
          <ToggleRow
            name="blocks_delivery"
            label="Ocorrência impeditiva"
            help="Ao ser registrada, a entrega ativa passa para Insucesso."
            defaultChecked={occurrenceType?.blocks_delivery ?? false}
            disabled={pending}
            ariaLabel="Alternar ocorrência impeditiva"
          />
        )}

        {/* Decision 6.3: the driver's report waits for the tower. */}
        {sections.authorization && (
          <ToggleRow
            name="requires_authorization"
            label="Exige autorização da torre"
            help="O relato do motorista fica aguardando, sem efeito, até a torre autorizar ou negar. Sem resposta em 10 minutos, os administradores são avisados."
            defaultChecked={occurrenceType?.requires_authorization ?? false}
            disabled={pending}
            ariaLabel="Alternar autorização da torre"
          />
        )}

        {isEditing && (
          <div
            className="flex items-center justify-between gap-3
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

        {sections.form && (
          // One field for live validation: moving between questions is not
          // leaving it.
          <div data-live-field="form_fields">
            <OccurrenceFormBuilder
              value={drafts}
              onChange={setDrafts}
              fieldErrors={showBuilderErrors ? verdict.fieldErrors : {}}
              formError={
                showBuilderErrors
                  ? (verdict.formError ?? null)
                  : (live.messageOf("form_fields") ?? null)
              }
              disabled={pending}
            />
          </div>
        )}

        {/* What the action sends: the checked definition, or "" for no form
            (a pause has none, whatever the builder still holds). */}
        <input
          type="hidden"
          name="form_fields"
          value={
            sections.form && verdict.valid && verdict.fields
              ? JSON.stringify(verdict.fields)
              : ""
          }
        />
      </div>

      <DialogFormFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>
        {/* Saving an edit is only offered once something changed (2.5);
        a broken form or a missing nature is shown and focused on press
        (decision 16.701), not hidden behind a disabled button. */}
        <Button
          type="submit"
          disabled={pending || !canSubmitForm({ isEdit: isEditing, isDirty })}
        >
          <span>{isEditing ? "Salvar Tipo" : "Criar Tipo"}</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </DialogFormFooter>
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
    guardFormAction(
      isEditing ? handleUpdateOccurrenceType : handleCreateOccurrenceType,
    ),
    defaultState,
  );

  const { formRef } = useOccurrenceTypeForm({ state, onClose });

  const submitOccurrenceTypeForm = (occurrenceTypeFormData: FormData) => {
    occurrenceTypeFormData.append("businessId", businessId);

    // Unchecked switches send nothing, and a switch the category hides must
    // go as "off" (decision 14.3): every one is spelled out.
    const category = (occurrenceTypeFormData.get("category") ??
      "NOT_DELIVERED") as OccurrenceCategoryKey;
    const toggles = toggleValues(
      category,
      (toggle) => occurrenceTypeFormData.get(toggle) === "true",
    );

    for (const toggle of CATEGORY_TOGGLES) {
      occurrenceTypeFormData.set(toggle, toggles[toggle]);
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
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Tipo de Ocorrência" : "Criar Novo Tipo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            É o vocabulário da operação: tipos de entrega (o motorista comprova
            por eles), de não entrega (problemas) e de pausa.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={submitOccurrenceTypeForm}
          noValidate
          data-occurrence-type-form
        >
          <OccurrenceTypeFormDialogSubmit
            state={state}
            occurrenceType={occurrenceType}
            onClose={onClose}
            formRef={formRef}
            isOpen={isOpen}
            businessId={businessId}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { OccurrenceTypeFormDialog };
