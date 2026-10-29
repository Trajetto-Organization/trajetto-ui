"use client";

import { useQuery } from "react-query";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchChatMessages } from "./lib/chat-reads";
import { formatPreviewLine, formatThreadTime } from "./lib/format";
import type { ChatHistoryFilter } from "./lib/types";

/** Enough to see what was said; the chat has the rest. */
const LINKED_MESSAGES_LIMIT = 5;

interface ChatLinkedMessagesProps {
  /** Only the MASTER passes it (the company selected in /admin). */
  actionBusinessId?: string;

  /** Whose thread: the one driver of the delivery or of the route. */
  driver: { id: string; name: string };

  /** The delivery or the route whose messages are shown. */
  filter: ChatHistoryFilter;

  /** Opens the chat on this history (see lib/chat-link). */
  onOpenChat: () => void;
}

/**
 * "Conversas" inside a delivery's or a route's detail (decision 6.7).
 *
 * The thread is one per driver; this shows only the messages tagged with
 * the delivery or the route, newest last, and hands the reader to the chat
 * filtered the same way. Read-only on purpose: writing belongs to the chat,
 * where the rest of the conversation is.
 */
const ChatLinkedMessages = ({
  actionBusinessId,
  driver,
  filter,
  onOpenChat,
}: ChatLinkedMessagesProps): JSX.Element => {
  const query = useQuery(
    [
      "chat-linked",
      actionBusinessId ?? "session",
      driver.id,
      filter.kind,
      filter.id,
    ],
    // A relay GET (lib/chat-reads), beside the detail's own reads.
    ({ signal }) =>
      fetchChatMessages(
        {
          driverId: driver.id,
          businessId: actionBusinessId,
          limit: LINKED_MESSAGES_LIMIT,
          ...(filter.kind === "delivery"
            ? { deliveryId: filter.id }
            : { routeId: filter.id }),
        },
        { signal },
      ),
    { staleTime: 0, refetchOnWindowFocus: false },
  );

  // The API answers newest first; a conversation reads top to bottom.
  const messages = [...(query.data?.data ?? [])].reverse();
  const hasOlder = Boolean(query.data?.nextCursor);

  return (
    <section className="min-w-0 space-y-2" aria-label="Conversas">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageCircle className="h-4 w-4" />
          Conversas
        </h3>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={onOpenChat}
        >
          Abrir no chat
        </Button>
      </div>

      {query.isLoading && (
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      )}

      {query.isError && (
        <p className="text-xs text-destructive">
          {(query.error as Error).message}
        </p>
      )}

      {query.isSuccess && messages.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma mensagem com {driver.name} sobre{" "}
          {filter.kind === "delivery" ? "esta entrega" : "esta rota"}.
        </p>
      )}

      {messages.length > 0 && (
        <ul className="min-w-0 space-y-1">
          {hasOlder && (
            <li className="text-xs text-muted-foreground">
              Mensagens anteriores no chat.
            </li>
          )}

          {messages.map((message) => (
            <li
              key={message.id}
              className="min-w-0 rounded-md bg-muted/60 px-2 py-1.5 text-xs"
            >
              <span className="font-medium">{message.sender.name}</span>
              <span className="text-muted-foreground">
                {" · "}
                {formatThreadTime(message.created_at)}
              </span>
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {formatPreviewLine(message.kind, message.body)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export { ChatLinkedMessages, LINKED_MESSAGES_LIMIT };
