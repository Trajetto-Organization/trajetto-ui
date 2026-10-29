"use client";

import { Loader, MessageCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { NOTIFICATION_ACCENT_CLASS } from "@/app/(protected)/_components/shared/notification-visuals";

import type {
  ChatThreadEntry,
  SentChatMessage,
} from "@/actions/chat/chat.types";

import { NewConversationPopover } from "./new-conversation-popover";
import { BroadcastDialog } from "./broadcast-dialog";

import {
  formatInitials,
  formatPreviewLine,
  formatThreadTime,
} from "./lib/format";

import { activeChatHint, chatHintLabel } from "./lib/chat-hints";

interface ThreadListProps {
  threads: ChatThreadEntry[];
  totalUnread: number;

  isLoading: boolean;
  errorMessage: string;
  onRetry: () => void;

  selectedDriverId: string | null;
  onSelectThread: (entry: ChatThreadEntry) => void;
  onSelectDriver: (driver: { id: string; name: string; cnh?: string }) => void;

  search: string;
  onSearchChange: (value: string) => void;

  /** Cross-thread text hits shown under the conversations while searching. */
  messageHits: SentChatMessage[];
  onSelectHit: (hit: SentChatMessage) => void;

  /** driverId → true while that driver is typing. */
  typingDrivers: Record<string, boolean>;

  /** driverId → true while that driver is recording a voice note. */
  recordingDrivers: Record<string, boolean>;

  canWrite: boolean;

  /** Support view: every write affordance is hidden, not just disabled. */
  isReadOnly: boolean;

  actionBusinessId?: string;

  onBroadcastSent: () => void;
  myUserId: string | null;
}

const ThreadList = ({
  threads,
  totalUnread,
  isLoading,
  errorMessage,
  onRetry,
  selectedDriverId,
  onSelectThread,
  onSelectDriver,
  search,
  onSearchChange,
  messageHits,
  onSelectHit,
  typingDrivers,
  recordingDrivers,
  canWrite,
  isReadOnly,
  actionBusinessId,
  onBroadcastSent,
  myUserId,
}: ThreadListProps): JSX.Element => {
  const renderPreview = (entry: ChatThreadEntry) => {
    // What is happening right now beats what was said last, and recording
    // beats typing — the rule lives in `chat-hints`, so this row and the
    // open conversation can never disagree about which one is showing.
    const hint = activeChatHint({
      typing: Boolean(typingDrivers[entry.driver.id]),
      recording: Boolean(recordingDrivers[entry.driver.id]),
    });

    if (hint) {
      return (
        <span className="text-xs font-medium italic text-primary">
          {chatHintLabel(hint)}
        </span>
      );
    }

    if (!entry.lastMessage) {
      return (
        <span className="text-xs text-muted-foreground">
          Sem mensagens ainda
        </span>
      );
    }

    // "Você:" for the reader's own messages, first name for a colleague,
    // nothing for the driver — the row already names them.
    const { sender } = entry.lastMessage;

    const prefix =
      sender.id === myUserId
        ? "Você: "
        : sender.id === entry.driverUser?.id
          ? ""
          : `${sender.name.split(" ")[0]}: `;

    return (
      <span className="truncate text-xs text-muted-foreground">
        {prefix}
        {formatPreviewLine(entry.lastMessage.kind, entry.lastMessage.body)}
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-tutorial="chat-threads">
      {/* -------------------------------------------------------- header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Conversas</p>

          {/* Unread is counted against the reader's own cursor, and support
          never advances one — the badge would sit lit forever, counting
          messages nobody is expected to answer. */}
          {!isReadOnly && totalUnread > 0 && (
            <span
              className={cn(
                `flex h-5 min-w-5 items-center justify-center rounded-full
                px-1 text-[10px] font-bold text-white`,

                // The same accent the notification bell uses, from the same
                // constant: an unread counter is one thing in this product,
                // so changing the palette one day has to change all of them.
                // No ring here — these pills sit on a flat surface and have
                // nothing to lift off, unlike the tab and sidebar badges.
                NOTIFICATION_ACCENT_CLASS,
              )}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>

        {/* Starting a conversation and broadcasting are both writing: a
        read-only viewer gets neither button, disabled or otherwise. */}
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <NewConversationPopover
              canWrite={canWrite}
              onPickDriver={onSelectDriver}
            />
            <BroadcastDialog
              canWrite={canWrite}
              actionBusinessId={actionBusinessId}
              onSent={onBroadcastSent}
            />
          </div>
        )}
      </div>

      {/* -------------------------------------------------------- search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2
            text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar conversa ou mensagem..."
            className="h-9 pl-8"
            aria-label="Buscar conversa ou mensagem"
          />
        </div>
      </div>

      {/* --------------------------------------------------------- rows */}
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
        ) : threads.length === 0 && messageHits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="max-w-[220px] text-center text-sm text-muted-foreground">
              {search
                ? "Nada encontrado com essa busca."
                : isReadOnly
                  ? "Nenhuma conversa ainda nesta empresa."
                  : "Nenhuma conversa ainda. Comece uma pelo botão acima — ou espere o primeiro olá de um motorista."}
            </p>
          </div>
        ) : (
          <>
            <ul>
              {threads.map((entry) => {
                const isSelected = entry.driver.id === selectedDriverId;

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelectThread(entry)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left",
                        "transition-colors hover:bg-muted/60",
                        isSelected && "bg-muted",
                      )}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="flex h-10 w-10 items-center justify-center
                          rounded-full bg-primary/10 text-sm font-semibold
                          text-primary"
                        >
                          {formatInitials(entry.driver.name)}
                        </div>

                        {entry.driverUser?.online && (
                          <span
                            className="absolute bottom-0 right-0 h-2.5 w-2.5
                            rounded-full border-2 border-card bg-green-500"
                            aria-label="Online"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {entry.driver.name}
                          </p>
                          {entry.lastMessage && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatThreadTime(entry.lastMessage.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1 truncate">
                            {renderPreview(entry)}
                          </div>

                          {!isReadOnly && entry.unreadCount > 0 && (
                            <span
                              className={cn(
                                `flex h-5 min-w-5 shrink-0 items-center
                                justify-center rounded-full px-1 text-[10px]
                                font-bold text-white`,
                                NOTIFICATION_ACCENT_CLASS,
                              )}
                            >
                              {entry.unreadCount > 99
                                ? "99+"
                                : entry.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {messageHits.length > 0 && (
              <div className="border-t">
                <p
                  className="px-4 pb-1 pt-3 text-xs font-semibold uppercase
                  tracking-wide text-muted-foreground"
                >
                  Mensagens
                </p>

                <ul>
                  {messageHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => onSelectHit(hit)}
                        className="flex w-full flex-col gap-0.5 px-4 py-2
                        text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">
                            {hit.driver.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatThreadTime(hit.created_at)}
                          </span>
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {formatPreviewLine(hit.kind, hit.body)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export { ThreadList };
