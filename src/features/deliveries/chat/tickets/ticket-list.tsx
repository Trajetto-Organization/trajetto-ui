"use client";

import { LifeBuoy, Loader, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChips } from "@/components/shared/custom/filter-chips";
import { RefreshButton } from "@/components/shared/custom/refresh-button";

import { cn } from "@/lib/utils";

import { NOTIFICATION_ACCENT_CLASS } from "@/app/(protected)/_components/shared/notification-visuals";

import type {
  SentChatMessage,
  TicketCounts,
  TicketSummary,
} from "@/actions/chat/chat.types";

import { NewConversationPopover } from "../new-conversation-popover";
import { BroadcastDialog } from "../broadcast-dialog";

import { formatPreviewLine, formatThreadTime } from "../lib/format";
import {
  TICKET_FILTERS,
  assigneeLine,
  ticketKindLabel,
  type TicketFilterKey,
} from "../lib/ticket-rules";
import {
  waitingLabel,
  waitingTone,
} from "../../occurrence-authorizations/rules";

interface TicketListProps {
  tickets: TicketSummary[];
  counts: TicketCounts | null;

  filter: TicketFilterKey;
  onFilterChange: (filter: TicketFilterKey) => void;

  search: string;
  onSearchChange: (value: string) => void;

  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string;
  onRetry: () => void;
  onRefresh: () => void;

  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;

  selectedTicketId: string | null;
  onSelectTicket: (ticket: TicketSummary) => void;

  /** "+ Novo atendimento": the driver is picked first. */
  onPickDriver: (driver: { id: string; name: string }) => void;

  /** Message text hits across the company (the conversation search). */
  messageHits: SentChatMessage[];
  onSelectHit: (hit: SentChatMessage) => void;

  canWrite: boolean;
  isReadOnly: boolean;
  actionBusinessId?: string;
  onBroadcastSent: () => void;
  myUserId: string | null;
}

const TONE_CLASS = {
  fresh: "text-muted-foreground",
  late: "text-amber-700 dark:text-amber-400",
  escalated: "text-red-700 dark:text-red-400",
} as const;

/**
 * The tickets column (design §6.1): filters (Abertos · Meus · Sem atendente ·
 * Aguardando autorização · Encerrados), server search including "#128", and
 * each ticket with its number, subject, driver, kind, who handles it, how
 * long an authorization has waited and the reader's unread.
 */
const TicketList = ({
  tickets,
  counts,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  isLoading,
  isRefreshing,
  errorMessage,
  onRetry,
  onRefresh,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedTicketId,
  onSelectTicket,
  onPickDriver,
  messageHits,
  onSelectHit,
  canWrite,
  isReadOnly,
  actionBusinessId,
  onBroadcastSent,
  myUserId,
}: TicketListProps): JSX.Element => {
  const now = Date.now();

  return (
    <div className="flex h-full min-h-0 flex-col" data-tutorial="chat-threads">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-sm font-semibold">Atendimentos</p>

          {!isReadOnly && (counts?.unreadOpen ?? 0) > 0 && (
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                NOTIFICATION_ACCENT_CLASS,
              )}
            >
              {(counts?.unreadOpen ?? 0) > 99 ? "99+" : counts?.unreadOpen}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <RefreshButton
            storageKey="chat-tickets-refresh"
            isRefreshing={isRefreshing}
            hideLabelOnMobile
            className="h-8"
            onRefresh={onRefresh}
          />

          {/* Opening a ticket and broadcasting are both writing: a read-only
          viewer gets neither button. */}
          {!isReadOnly && (
            <>
              <NewConversationPopover
                canWrite={canWrite}
                onPickDriver={onPickDriver}
              />
              <BroadcastDialog
                canWrite={canWrite}
                actionBusinessId={actionBusinessId}
                onSent={onBroadcastSent}
              />
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 border-b p-3">
        <FilterChips
          label="Situação dos atendimentos"
          value={filter}
          onChange={onFilterChange}
          options={TICKET_FILTERS.map((option) => ({
            value: option.key,
            label: option.label,
            count: option.count && counts ? counts[option.count] : undefined,
          }))}
        />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por assunto, motorista ou #número..."
            className="h-9 pl-8"
            aria-label="Buscar atendimento"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <p className="text-center text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        ) : tickets.length === 0 && messageHits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/40" />
            <p className="max-w-[240px] text-center text-sm text-muted-foreground">
              {search
                ? "Nenhum atendimento encontrado com essa busca."
                : "Nenhum atendimento aqui."}
            </p>
          </div>
        ) : (
          <ul>
            {tickets.map((ticket) => {
              const pending =
                ticket.status === "OPEN" &&
                ticket.occurrence?.authorization_status === "PENDING";
              const tone =
                pending && ticket.occurrence?.escalates_at
                  ? waitingTone(
                      {
                        escalates_at: ticket.occurrence.escalates_at,
                        escalated_at: null,
                      },
                      now,
                    )
                  : null;

              return (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTicket(ticket)}
                    aria-current={
                      ticket.id === selectedTicketId ? "true" : undefined
                    }
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      ticket.id === selectedTicketId && "bg-muted",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">
                        <span className="text-muted-foreground">
                          #{ticket.number}
                        </span>{" "}
                        {ticket.subject}
                      </p>
                      {ticket.last_message_at && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatThreadTime(ticket.last_message_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-xs text-muted-foreground">
                        {ticket.driver.name} · {ticketKindLabel(ticket.kind)} ·{" "}
                        {assigneeLine(ticket, myUserId)}
                      </p>

                      {!isReadOnly && ticket.unreadCount > 0 && (
                        <span
                          className={cn(
                            "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                            NOTIFICATION_ACCENT_CLASS,
                          )}
                        >
                          {ticket.unreadCount > 99 ? "99+" : ticket.unreadCount}
                        </span>
                      )}
                    </div>

                    {pending && tone && (
                      <p
                        className={cn("text-xs font-medium", TONE_CLASS[tone])}
                      >
                        Aguardando autorização ·{" "}
                        {waitingLabel(ticket.created_at, now)}
                      </p>
                    )}

                    {ticket.status === "CLOSED" && (
                      <p className="text-xs text-muted-foreground">Encerrado</p>
                    )}
                  </button>
                </li>
              );
            })}

            {messageHits.length > 0 && (
              <li className="border-t">
                <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mensagens
                </p>
                <ul>
                  {messageHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => onSelectHit(hit)}
                        className="flex w-full flex-col gap-0.5 px-4 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">
                            {hit.driver.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatThreadTime(hit.created_at)}
                          </span>
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {formatPreviewLine(hit.kind, hit.body)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {hasMore && (
              <li className="p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Carregando..." : "Carregar mais"}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export { TicketList };
