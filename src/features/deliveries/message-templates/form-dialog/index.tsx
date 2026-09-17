"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Loader, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { Textarea } from "@/components/ui/textarea";

import {
  saveMessageTemplate,
  type MessageTemplate,
} from "@/actions/delivery/message-templates";

import { TEMPLATE_VARIABLES, type MessageSlot } from "../lib/catalogue";

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
 * The API's refusals are shown VERBATIM. It refuses an unknown variable and a
 * WhatsApp message with no opt-out link, and re-implementing those checks here
 * would be a second copy of the rules, free to drift from the one that
 * actually decides.
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

  const isEmail = slot.channel === "EMAIL";

  const insertVariable = (name: string) => {
    const field = document.getElementById(
      "template-body",
    ) as HTMLTextAreaElement | null;

    const token = `{{${name}}}`;

    if (!field) {
      setBody((current) => `${current}${token}`);
      return;
    }

    const start = field.selectionStart ?? body.length;
    const end = field.selectionEnd ?? body.length;

    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;

    setBody(next.slice(0, BODY_LIMIT));

    // Put the caret after what was just inserted, so the next word continues
    // the sentence instead of restarting it.
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const result = await saveMessageTemplate(businessId, {
        topic: slot.topic,
        channel: slot.channel,
        subject: isEmail ? subject || null : null,
        body,
        is_active: isActive,
      });

      if (!result.success) {
        // Verbatim: the sentence names the variable or the missing opt-out
        // link, which is exactly what the person has to fix.
        toast.error(result.message, { duration: 8000 });
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
      <DialogScrollContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{slot.title}</DialogTitle>
          <DialogDescription>{slot.when}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEmail && (
            <div className="grid gap-2">
              <Label htmlFor="template-subject">Assunto</Label>

              <Input
                id="template-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={150}
                placeholder="Sua entrega chegou"
                disabled={isSaving}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="template-body">Mensagem</Label>

            <Textarea
              id="template-body"
              value={body}
              onChange={(event) =>
                setBody(event.target.value.slice(0, BODY_LIMIT))
              }
              rows={7}
              disabled={isSaving}
              placeholder={slot.suggestion}
              className="resize-none font-mono text-sm"
            />

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving || body.length > 0}
                onClick={() => setBody(slot.suggestion)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Usar sugestão
              </Button>

              <p className="text-right text-xs text-muted-foreground">
                {body.length}/{BODY_LIMIT}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Toque para inserir no texto
            </Label>

            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={isSaving}
                  onClick={() => insertVariable(name)}
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

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
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

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || body.trim().length < 10}
              className="gap-2"
            >
              {isSaving && <Loader className="h-4 w-4 animate-spin" />}
              Salvar mensagem
            </Button>
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { MessageTemplateDialog, BODY_LIMIT };
