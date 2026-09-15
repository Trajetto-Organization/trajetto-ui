"use client";

import { useMemo, useState } from "react";
import { useQuery } from "react-query";

import { Mail, MessageCircle, Pencil, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

import {
  listMessageTemplates,
  type MessageTemplate,
} from "@/actions/delivery/message-templates";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { MESSAGE_SLOTS, slotKey } from "./lib/catalogue";
import { MessageTemplateDialog } from "./form-dialog";

interface MessageTemplatesPanelProps {
  businessId: string;
}

/**
 * The six messages a company can write to the people waiting for its
 * deliveries.
 *
 * Cards rather than a table, because this is not a list that grows — it is a
 * fixed set of six slots, three moments on two channels, and a table over six
 * rows with a permanent shape is a table pretending to be data.
 *
 * A slot with nothing written in it says so plainly, and says what the
 * consequence is: nothing is sent. That is the single most important sentence
 * on this screen — a dispatcher who assumes the product notifies customers by
 * default would otherwise discover it by a customer never hearing anything.
 */
const MessageTemplatesPanel = ({
  businessId,
}: MessageTemplatesPanelProps): JSX.Element => {
  const [editing, setEditing] = useState<{
    slot: (typeof MESSAGE_SLOTS)[number];
    template: MessageTemplate | null;
  } | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const { data, isLoading, refetch } = useQuery(
    ["delivery_message_template", businessId],
    () => listMessageTemplates(businessId),
    { refetchOnWindowFocus: false },
  );

  const byKey = useMemo(() => {
    const map = new Map<string, MessageTemplate>();

    for (const template of data?.data ?? []) {
      map.set(slotKey(template.topic, template.channel), template);
    }

    return map;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {MESSAGE_SLOTS.map((slot) => (
          <Skeleton key={slotKey(slot.topic, slot.channel)} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-3
        dark:border-amber-900 dark:bg-amber-950/30"
      >
        <p
          className="flex items-start gap-2 text-sm
          text-amber-900 dark:text-amber-200"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Sem mensagem escrita, nada é enviado.</strong> O Trajetto
            não fala com os seus clientes por conta própria — cada momento
            abaixo só vira mensagem quando você escrever o texto dele.
          </span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MESSAGE_SLOTS.map((slot) => {
          const template = byKey.get(slotKey(slot.topic, slot.channel)) ?? null;

          const active = Boolean(template?.is_active);
          const Icon = slot.channel === "WHATSAPP" ? MessageCircle : Mail;

          return (
            <article
              key={slotKey(slot.topic, slot.channel)}
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{slot.title}</span>
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {slot.when}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={
                    active
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }
                >
                  {template ? (active ? "Ativa" : "Desativada") : "Não escrita"}
                </Badge>
              </header>

              <p className="min-h-[3rem] whitespace-pre-wrap text-xs text-muted-foreground">
                {template
                  ? template.body.slice(0, 160) +
                    (template.body.length > 160 ? "…" : "")
                  : "Nenhuma mensagem é enviada neste momento."}
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canWrite}
                title={canWrite ? undefined : permissionsRequired.tooltipMessage}
                onClick={() => setEditing({ slot, template })}
                className="w-full gap-2"
              >
                <Pencil className="h-4 w-4" />
                {template ? "Editar" : "Escrever"}
              </Button>
            </article>
          );
        })}
      </div>

      {editing && (
        <MessageTemplateDialog
          businessId={businessId}
          slot={editing.slot}
          template={editing.template}
          isOpen
          onClose={() => setEditing(null)}
          onSaved={() => void refetch()}
        />
      )}
    </div>
  );
};

export { MessageTemplatesPanel };
