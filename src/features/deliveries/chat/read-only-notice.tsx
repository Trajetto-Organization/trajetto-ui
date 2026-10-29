"use client";

import { Eye } from "lucide-react";

/**
 * Sits where the composer would be, for the MASTER.
 *
 * The chat is the company's own voice: a message sent from here would reach
 * the driver looking like it came from his central. Support reads it all
 * and writes nothing — so the panel says why, instead of letting someone
 * type a whole message just to collect a 403.
 */
const ReadOnlyNotice = (): JSX.Element => (
  <div
    className="flex items-start gap-2.5 border-t bg-muted/40 px-4 py-3"
    role="note"
    aria-label="Acesso somente leitura"
  >
    <Eye
      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />

    <div className="min-w-0">
      <p className="text-xs font-medium">Visualização de suporte</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        Você acompanha as conversas desta empresa para dar suporte, mas quem
        fala com o motorista é a operação dela — por isso o envio de mensagens
        fica desativado por aqui.
      </p>
    </div>
  </div>
);

export { ReadOnlyNotice };
