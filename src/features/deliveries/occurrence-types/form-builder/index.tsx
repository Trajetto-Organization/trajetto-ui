"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { cn } from "@/lib/utils";

import {
  FIELD_TYPE_LABELS,
  MAX_FORM_FIELDS,
  emptyDraft,
  keyFromLabel,
  type DraftField,
  type DraftFieldErrors,
} from "./builder-rules";
import {
  OCCURRENCE_FORM_FIELD_TYPES,
  type OccurrenceFormFieldType,
} from "./rules";

/**
 * Red while the input is in error (decision 3.4), as FormInput and
 * TextareaField do: the plain Input/Textarea/SelectTrigger have no
 * aria-invalid style of their own.
 */
const invalidBorder = (control: { "aria-invalid"?: true }) =>
  control["aria-invalid"] && "border-red-600 dark:border-red-500";

interface OccurrenceFormBuilderProps {
  value: DraftField[];
  onChange: (next: DraftField[]) => void;
  /** Problems by question index, per input (definitionFromDrafts). */
  fieldErrors?: Record<number, DraftFieldErrors>;
  formError?: string | null;
  disabled?: boolean;
}

/**
 * The questions a driver answers when reporting this type (decision 6.2).
 *
 * Deliberately a list and not a canvas: a form the driver fills on the street
 * is a handful of questions in order. Each question has its label, an
 * optional hint for the driver, whether it is required and what kind of
 * answer it takes. The key is derived from the label until someone edits it:
 * answers are stored by it, so renaming a question later keeps its history.
 */
const OccurrenceFormBuilder = ({
  value,
  onChange,
  fieldErrors = {},
  formError,
  disabled = false,
}: OccurrenceFormBuilderProps): JSX.Element => {
  const takenKeys = (except: string) =>
    new Set(
      value.filter((field) => field.uid !== except).map((field) => field.key),
    );

  const update = (uid: string, patch: Partial<DraftField>) =>
    onChange(
      value.map((field) => {
        if (field.uid !== uid) return field;

        const next = { ...field, ...patch };

        // The key follows the label until it is edited by hand.
        if (patch.label !== undefined && !field.keyEdited) {
          next.key = keyFromLabel(patch.label, takenKeys(uid));
        }

        return next;
      }),
    );

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;

    if (target < 0 || target >= value.length) return;

    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (uid: string) =>
    onChange(value.filter((field) => field.uid !== uid));

  const add = () => onChange([...value, emptyDraft()]);

  const full = value.length >= MAX_FORM_FIELDS;

  return (
    <div className="space-y-3" data-tutorial="occurrence-type-form-builder">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          Formulário do motorista (opcional)
        </p>
        <p className="text-xs text-muted-foreground">
          Perguntas que o motorista responde ao registrar este tipo, no app,
          mesmo sem sinal. A torre lê as respostas antes de decidir.
        </p>
      </div>

      {value.length === 0 && (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Sem formulário: o motorista escolhe o tipo, descreve e anexa fotos.
        </p>
      )}

      <ol className="space-y-3">
        {value.map((field, index) => {
          const position = index + 1;
          const errors = fieldErrors[index];
          const inputError = (input: keyof DraftFieldErrors["inputs"]) =>
            errors?.inputs[input] ?? null;

          return (
            <li
              key={field.uid}
              className="min-w-0 space-y-3 rounded-lg border p-3"
              aria-label={`Campo ${position}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Campo {position}
                </span>

                <div className="ml-auto flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={`Mover campo ${position} para cima`}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === value.length - 1}
                    aria-label={`Mover campo ${position} para baixo`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(field.uid)}
                    disabled={disabled}
                    aria-label={`Remover campo ${position}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
                <FieldShell
                  label="Pergunta *"
                  htmlFor={`${field.uid}-label`}
                  error={inputError("label")}
                >
                  {(control) => (
                    <Input
                      {...control}
                      className={cn(invalidBorder(control))}
                      value={field.label}
                      maxLength={80}
                      placeholder="Ex: Quem atendeu no endereço"
                      onChange={(event) =>
                        update(field.uid, { label: event.target.value })
                      }
                      disabled={disabled}
                    />
                  )}
                </FieldShell>

                <FieldShell
                  label="Tipo de resposta *"
                  htmlFor={`${field.uid}-type`}
                  error={inputError("type")}
                >
                  {(control) => (
                    <Select
                      value={field.type}
                      onValueChange={(type) =>
                        update(field.uid, {
                          type: type as OccurrenceFormFieldType,
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger
                        {...control}
                        className={cn("w-full", invalidBorder(control))}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OCCURRENCE_FORM_FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FieldShell>
              </div>

              <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <FieldShell
                  label="Chave *"
                  htmlFor={`${field.uid}-key`}
                  error={inputError("key")}
                  hint="Identifica a resposta nos relatórios; mantenha depois dos primeiros relatos."
                >
                  {(control) => (
                    <Input
                      {...control}
                      className={cn(invalidBorder(control))}
                      value={field.key}
                      maxLength={40}
                      onChange={(event) =>
                        update(field.uid, {
                          key: event.target.value,
                          keyEdited: true,
                        })
                      }
                      disabled={disabled}
                    />
                  )}
                </FieldShell>

                <FieldShell
                  label="Orientação ao motorista (opcional)"
                  htmlFor={`${field.uid}-help`}
                  error={inputError("help")}
                >
                  {(control) => (
                    <Input
                      {...control}
                      className={cn(invalidBorder(control))}
                      value={field.help}
                      maxLength={200}
                      placeholder="Aparece sob a pergunta, no app"
                      onChange={(event) =>
                        update(field.uid, { help: event.target.value })
                      }
                      disabled={disabled}
                    />
                  )}
                </FieldShell>
              </div>

              {field.type === "select" && (
                <FieldShell
                  label="Opções *"
                  htmlFor={`${field.uid}-options`}
                  error={inputError("options")}
                  hint="Uma por linha, de 2 a 20."
                >
                  {(control) => (
                    <Textarea
                      {...control}
                      className={cn(invalidBorder(control))}
                      value={field.optionsText}
                      rows={3}
                      placeholder={"Endereço errado\nRecusa\nAusente"}
                      onChange={(event) =>
                        update(field.uid, { optionsText: event.target.value })
                      }
                      disabled={disabled}
                    />
                  )}
                </FieldShell>
              )}

              {field.type === "text" && (
                <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  <FieldShell
                    label="Limite de caracteres *"
                    htmlFor={`${field.uid}-max-length`}
                    error={inputError("max_length")}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        className={cn(invalidBorder(control))}
                        inputMode="numeric"
                        value={field.maxLength}
                        onChange={(event) =>
                          update(field.uid, { maxLength: event.target.value })
                        }
                        disabled={disabled}
                      />
                    )}
                  </FieldShell>

                  <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 sm:mt-6">
                    <Label
                      htmlFor={`${field.uid}-multiline`}
                      className="text-sm font-normal"
                    >
                      Várias linhas
                    </Label>
                    <Switch
                      id={`${field.uid}-multiline`}
                      checked={field.multiline}
                      onCheckedChange={(multiline) =>
                        update(field.uid, { multiline })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}

              {field.type === "number" && (
                <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-3">
                  <FieldShell
                    label="Mínimo (opcional)"
                    htmlFor={`${field.uid}-min`}
                    error={inputError("min")}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        className={cn(invalidBorder(control))}
                        inputMode="decimal"
                        value={field.min}
                        onChange={(event) =>
                          update(field.uid, { min: event.target.value })
                        }
                        disabled={disabled}
                      />
                    )}
                  </FieldShell>
                  <FieldShell
                    label="Máximo (opcional)"
                    htmlFor={`${field.uid}-max`}
                    error={inputError("max")}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        className={cn(invalidBorder(control))}
                        inputMode="decimal"
                        value={field.max}
                        onChange={(event) =>
                          update(field.uid, { max: event.target.value })
                        }
                        disabled={disabled}
                      />
                    )}
                  </FieldShell>
                  <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 sm:mt-6">
                    <Label
                      htmlFor={`${field.uid}-integer`}
                      className="text-sm font-normal"
                    >
                      Só inteiros
                    </Label>
                    <Switch
                      id={`${field.uid}-integer`}
                      checked={field.integer}
                      onCheckedChange={(integer) =>
                        update(field.uid, { integer })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor={`${field.uid}-required`}
                  className="text-sm font-normal"
                >
                  Resposta obrigatória
                </Label>
                <Switch
                  id={`${field.uid}-required`}
                  checked={field.required}
                  onCheckedChange={(required) =>
                    update(field.uid, { required })
                  }
                  disabled={disabled}
                />
              </div>

              {/* Only what no input owns; the rest is under its input. Not
                  role=alert: this text follows every keystroke. */}
              {errors?.card && (
                <p className="break-words text-xs text-destructive [overflow-wrap:anywhere]">
                  {errors.card}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {formError && <p className="text-xs text-destructive">{formError}</p>}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={add}
        disabled={disabled || full}
        title={
          full
            ? `O formulário aceita no máximo ${MAX_FORM_FIELDS} campos.`
            : undefined
        }
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Adicionar pergunta
      </Button>
    </div>
  );
};

export { OccurrenceFormBuilder };
