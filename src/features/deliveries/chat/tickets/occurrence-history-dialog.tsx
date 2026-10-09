"use client";

import { useQuery } from "react-query";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getTicket,
  listTicketEvents,
  listTickets,
} from "@/actions/chat/tickets";
import { listChatMessages } from "@/actions/chat/list-chat-messages";

import type { OccurrenceRow } from "../../lib/panels";

import { formatPreviewLine, formatThreadTime } from "../lib/format";
import {
  TICKETS_QUERY_ROOT,
  ticketEventLine,
  ticketTitle,
} from "../lib/ticket-rules";
import { authorizationBadge } from "../../occurrence-authorizations/rules";

/** Enough to see where the conversation is; the chat has the rest. */
const HISTORY_MESSAGES_LIMIT = 5;

interface OccurrenceHistoryDialogProps {
  occurrence: OccurrenceRow;
  actionBusinessId?: string;
  onOpenConversation: (ticketId: string) => void;
  onClose: () => void;
}

/**
 * "Ver histórico da ocorrência" (design §6.3): the report as filed (type,
 * when, who, description, photos), the tower's say on it, the ticket's trail
 * (opened, taken, decided, closed — with the names) and its last messages.
 * Without a ticket, the report and the authorization alone.
 */
const OccurrenceHistoryDialog = ({
  occurrence,
  actionBusinessId,
  onOpenConversation,
  onClose,
}: OccurrenceHistoryDialogProps): JSX.Element => {
  const ticketQuery = useQuery(
    [TICKETS_QUERY_ROOT, "of-occurrence", occurrence.id],
    async () => {
      const found = await listTickets({
        businessId: actionBusinessId,
        status: "ALL",
        occurrenceId: occurrence.id,
        pageSize: 1,
      });

      const summary = found.success ? found.data?.data[0] : undefined;

      if (!summary) return null;

      const [detail, events, messages] = await Promise.all([
        getTicket({ ticketId: summary.id, businessId: actionBusinessId }),
        listTicketEvents({
          ticketId: summary.id,
          businessId: actionBusinessId,
        }),
        listChatMessages({
          threadId: summary.threadId,
          ticketId: summary.id,
          limit: HISTORY_MESSAGES_LIMIT,
          businessId: actionBusinessId,
        }),
      ]);

      return {
        ticket: detail.success && detail.data ? detail.data : summary,
        events: events.success && events.data ? events.data.data : [],
        // Newest first from the API; read top to bottom.
        messages:
          messages.success && messages.data
            ? [...messages.data.data].reverse()
            : [],
      };
    },
    { staleTime: 0 },
  );

  const badge = authorizationBadge(occurrence.authorization_status);
  const history = ticketQuery.data;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent
        className="max-w-xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Histórico da ocorrência</DialogTitle>
          <DialogDescription className="break-words [overflow-wrap:anywhere]">
            {occurrence.occurrenceType.name} —{" "}
            {occurrence.delivery.recipient_name}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 text-sm">
          <section className="space-y-1" aria-label="Relato">
            <h3 className="font-semibold">Relato</h3>
            <p className="text-muted-foreground">
              Por {occurrence.reportedBy.name} em{" "}
              {formatThreadTime(
                occurrence.occurred_at ?? occurrence.created_at,
              )}
            </p>
            {occurrence.description && (
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {occurrence.description}
              </p>
            )}
            {occurrence.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {occurrence.photos.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                  >
                    Foto {index + 1}
                  </a>
                ))}
              </div>
            )}
            {badge && (
              <p className="text-xs">
                Autorização: <span className="font-medium">{badge.label}</span>
                {occurrence.authorization_note
                  ? ` — ${occurrence.authorization_note}`
                  : ""}
              </p>
            )}
          </section>

          <section className="space-y-1" aria-label="Atendimento">
            <h3 className="font-semibold">Atendimento</h3>

            {ticketQuery.isLoading && <Skeleton className="h-16 w-full" />}

            {ticketQuery.isSuccess && !history && (
              <p className="text-xs text-muted-foreground">
                Esta ocorrência não tem atendimento.
              </p>
            )}

            {history && (
              <>
                <p className="text-xs font-medium">
                  {ticketTitle(history.ticket)}
                </p>

                <ol className="space-y-0.5 border-l pl-3 text-xs">
                  {history.events.map((event) => (
                    <li key={event.id}>
                      <span className="text-muted-foreground">
                        {formatThreadTime(event.created_at)} ·{" "}
                      </span>
                      {ticketEventLine(event)}
                    </li>
                  ))}
                </ol>

                {history.messages.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {history.messages.map((message) => (
                      <li
                        key={message.id}
                        className="rounded-md bg-muted/60 px-2 py-1.5 text-xs"
                      >
                        <span className="font-medium">
                          {message.sender.name}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatThreadTime(message.created_at)}
                        </span>
                        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {formatPreviewLine(message.kind, message.body)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>

        <DialogFormFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {history && (
            <Button
              type="button"
              onClick={() => onOpenConversation(history.ticket.id)}
            >
              Ver conversa
            </Button>
          )}
        </DialogFormFooter>
      </DialogScrollContent>
    </Dialog>
  );
};

export { OccurrenceHistoryDialog, HISTORY_MESSAGES_LIMIT };
