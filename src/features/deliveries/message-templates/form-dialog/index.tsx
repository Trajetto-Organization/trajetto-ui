"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Loader, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { Textarea } from "@/components/ui/textarea";
import { FieldShell } from "@/components/shared/custom/field-shell";

import {
  saveMessageTemplate,
  type MessageTemplate,
} from "@/actions/delivery/message-templates";
import { isStaleActionResult } from "@/lib/action-result";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { TEMPLATE_VARIABLES, type MessageSlot } from "../lib/catalogue";
import {
  insertToken,
  isTemplateDirty,
  templateBodyError,
  templateSubjectError,
} from "../lib/template-rules";
import { truncateText } from "@/lib/truncate-text";

interface MessageTemplateDialogProps {
  businessId: string;
  slot: MessageSlot;
  template: MessageTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const BODY_LIMIT = 900;

/**
 * Writing one of the six messages.
 *
 * The variable chips insert at the cursor rather than at the end, because a
 * dispatcher writes the sentence first and drops the name into the middle of
 * it — appending would make them cut and paste every time.
 *
 * The rules the API applies (unknown variables such as `{{ gabriel }}`, the
 * WhatsApp opt-out link, a body made of spaces) are pre-checked here with
 * the API's sentences and shown under the field, live (decision 16.700):
 * once the field is left, then on every change. The API remains the
 * authority, and its refusal is shown in the same place until the message
 * is edited.
 */
const MessageTemplateDialog = ({
  businessId,
  slot,
  template,
  isOpen,
  onClose,
  onSaved,
}: MessageTemplateDialogProps): JSX.Element => {
  const [subject, setSubject] = useState<string>(template?.subject ?? "");
  const [body, setBody] = useState<string>(template?.body ?? "");

  const [isActive, setIsActive] = useState<boolean>(
    template?.is_active ?? true,
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // The API's refusal names the variable or the missing opt-out link: it
  // sits under the message until the message is edited.
  const [serverErrors, setServerErrors] = useState<{ body?: string[] } | null>(
    null,
  );

  const isEmail = slot.channel === "EMAIL";

  const live = useLiveValidation({
    values: { subject, body },
    rules: (values) => ({
      subject: isEmail ? templateSubjectError(values.subject) : null,
      body: templateBodyError(values.body, slot.channel),
    }),
    fields: isEmail ? ["subject", "body"] : ["body"],
    serverErrors,
    controlIds: { subject: "template-subject", body: "template-body" },
    // Not a <form>: Salvar calls validate() itself.
    validateOnSubmit: false,
  });

  // Decision 2.5: editing a saved message, Salvar waits for a change.
  const isDirty = isTemplateDirty(template, {
    subject: isEmail ? subject : (template?.subject ?? ""),
    body,
    is_active: isActive,
  });

  const insertVariable = (name: string) => {
    const field = document.getElementById(
      "template-body",
    ) as HTMLTextAreaElement | null;

    const token = `{{${name}}}`;

    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? body.length;

    const next = insertToken(body, start, end, token, BODY_LIMIT);

    // Cutting the token at the limit would leave a broken "{{link_desc".
    if (next === null) {
      toast.warning(
        `Não há espaço para ${token}: a mensagem tem no máximo ${BODY_LIMIT} caracteres.`,
      );
      return;
    }

    setBody(next);

    // Put the caret after what was just inserted, so the next word continues
    // the sentence instead of restarting it.
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    if (!live.validate()) return;

    setIsSaving(true);

    try {
      const result = await saveMessageTemplate(businessId, {
        topic: slot.topic,
        channel: slot.channel,
        subject: isEmail ? subject || null : null,
        body,
        is_active: isActive,
      });

      if (isStaleActionResult(result)) return;

      if (!result.success) {
        // Under the field it is about: it names the variable or the missing
        // opt-out link, which is exactly what the person has to fix.
        setServerErrors({ body: [result.message] });
        return;
      }

      toast.success(result.message);

      onSaved();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* max-w-xl: Cancelar and Salvar share the row full width (decision
          3.2), like the other catalogue dialogs of Entregas. */}
      <DialogScrollContent className="max-h-[90vh] max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{slot.title}</DialogTitle>
          <DialogDescription>{slot.when}</DialogDescription>
        </DialogHeader>

        <div ref={live.ref} className="space-y-4">
          {isEmail && (
            <FieldShell
              label="Assunto (opcional)"
              htmlFor="template-subject"
              error={live.errorOf("subject")}
              hint="Sem assunto, o e-mail sai como “Nome da transportadora — atualização da sua entrega”."
            >
              {(control) => (
                <Input
                  {...control}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={150}
                  placeholder="Sua entrega chegou"
                  disabled={isSaving}
                />
              )}
            </FieldShell>
          )}

          <FieldShell
            label="Mensagem *"
            htmlFor="template-body"
            error={live.errorOf("body")}
          >
            {(control) => (
              <Textarea
                {...control}
                value={body}
                onChange={(event) =>
                  setBody(truncateText(event.target.value, BODY_LIMIT))
                }
                rows={7}
                disabled={isSaving}
                placeholder={slot.suggestion}
                className="resize-none font-mono text-sm"
              />
            )}
          </FieldShell>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving || body.length > 0}
              onClick={() => setBody(slot.suggestion)}
              className="gap-2"
              // Part of writing the message, not leaving it.
              {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
            >
              <Sparkles className="h-4 w-4" />
              Usar sugestão
            </Button>

            <p className="text-right text-xs text-muted-foreground">
              {body.length}/{BODY_LIMIT}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Toque para inserir no texto
            </p>

            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={isSaving}
                  onClick={() => insertVariable(name)}
                  // A chip writes into the message; tapping one while the
                  // sentence is half written is not leaving the field.
                  {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
                  className="rounded-md border px-2 py-1 font-mono text-xs
                  hover:bg-muted disabled:opacity-50"
                >
                  {`{{${name}}}`}
                </button>
              ))}
            </div>

            {slot.channel === "WHATSAPP" && (
              <p className="text-xs text-muted-foreground">
                O WhatsApp exige{" "}
                <span className="font-mono">{"{{link_descadastro}}"}</span> na
                mensagem: sem uma saída, uma mensagem que o cliente não pediu
                vira denúncia de spam.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="template-active">Mensagem ativa</Label>
              <p className="text-xs text-muted-foreground">
                Desativada, nada é enviado neste momento — e o texto fica
                guardado para quando você quiser voltar.
              </p>
            </div>

            <Switch
              id="template-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSaving}
              aria-label="Alternar mensagem ativa"
            />
          </div>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                isSaving ||
                !canSubmitForm({ isEdit: template !== null, isDirty })
              }
              className="gap-2"
            >
              {isSaving && <Loader className="h-4 w-4 animate-spin" />}
              Salvar mensagem
            </Button>
          </DialogFormFooter>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { MessageTemplateDialog, BODY_LIMIT };
