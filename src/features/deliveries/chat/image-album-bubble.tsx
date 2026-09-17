"use client";

import Image from "next/image";

import { Check, CheckCheck, Clock, Package, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { resolveCheckState } from "./lib/check-state";
import { formatClock } from "./lib/format";
import { MEDIA_BUBBLE_WIDTH_CLASS } from "./lib/media-bubble";
import type { ClientChatMessage } from "./lib/types";

/** Past this the grid stops growing and the last cell counts the rest. */
const VISIBLE_CELLS = 4;

interface ImageAlbumBubbleProps {
  /** Two or more IMAGE messages; a single photo stays a normal bubble. */
  messages: ClientChatMessage[];

  isOwnSide: boolean;
  showSenderName: boolean;

  counterpartDeliveredAt: string | null;
  counterpartLastReadAt: string | null;

  onOpenDelivery: (deliveryId: string) => void;

  /**
   * The cell's own message. The conversation turns it into a position in the
   * gallery, which is what makes the photos past the fourth cell reachable
   * at last: they were never clickable here, and now they are one swipe from
   * the `+N` cell rather than a dead end.
   */
  onOpenImage: (message: ClientChatMessage) => void;

  onRetry: (message: ClientChatMessage) => void;
}

/**
 * A run of photos as one bubble with a 2-column grid.
 *
 * Each cell is still its own message underneath — that is what lets a single
 * failed upload keep its retry inside the album instead of dragging the
 * whole batch down with it. The caption, the clock and the checks come from
 * the last message, which by construction is the one carrying them.
 */
const ImageAlbumBubble = ({
  messages,
  isOwnSide,
  showSenderName,
  counterpartDeliveredAt,
  counterpartLastReadAt,
  onOpenDelivery,
  onOpenImage,
  onRetry,
}: ImageAlbumBubbleProps): JSX.Element => {
  const last = messages[messages.length - 1];

  const visible = messages.slice(0, VISIBLE_CELLS);
  const hiddenCount = messages.length - visible.length;

  const checkState = resolveCheckState({
    createdAt: last.created_at,
    pending: messages.some((message) => message.pending),
    counterpartDeliveredAt,
    counterpartLastReadAt,
  });

  const renderChecks = () => {
    if (!isOwnSide) return null;

    if (checkState === "pending") {
      return <Clock className="h-3 w-3 opacity-70" aria-label="Enviando" />;
    }

    if (messages.some((message) => message.failed)) return null;

    if (checkState === "read") {
      return (
        <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Lidas" />
      );
    }

    if (checkState === "delivered") {
      return (
        <CheckCheck
          className="h-3.5 w-3.5 opacity-70"
          aria-label="Entregues"
        />
      );
    }

    return <Check className="h-3.5 w-3.5 opacity-70" aria-label="Enviadas" />;
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        isOwnSide ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%]",
          isOwnSide ? "items-end" : "items-start",
        )}
      >
        {showSenderName && (
          <span
            className="mb-0.5 max-w-full break-words px-1 text-xs font-medium
            text-muted-foreground"
          >
            {last.sender.name}
          </span>
        )}

        <div
          className={cn(
            "max-w-full rounded-2xl p-1.5 shadow-sm",
            isOwnSide
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted",
          )}
        >
          {/* One column at the album's width holds everything: the caption,
              the delivery chip and the clock all measure themselves against
              the grid instead of against their own content. */}
          <div className={MEDIA_BUBBLE_WIDTH_CLASS}>
            <div className="grid grid-cols-2 gap-1">
              {visible.map((message, index) => {
                const isLastCell = index === visible.length - 1;
                const showCounter = isLastCell && hiddenCount > 0;

                return (
                  <div
                    key={message.id}
                    className="relative aspect-square overflow-hidden
                    rounded-lg bg-background/20"
                  >
                    {message.attachment_url && (
                      <button
                        type="button"
                        onClick={() => onOpenImage(message)}
                        className="block h-full w-full"
                        aria-label="Ampliar imagem"
                      >
                        <Image
                          src={message.attachment_url}
                          alt="Foto enviada no chat"
                          width={140}
                          height={140}
                          unoptimized
                          className={cn(
                            "h-full w-full object-cover",
                            message.pending && "opacity-60",
                          )}
                        />
                      </button>
                    )}

                    {showCounter && (
                      <div
                        className="pointer-events-none absolute inset-0 flex
                        items-center justify-center bg-black/55 text-lg
                        font-semibold text-white"
                      >
                        +{hiddenCount}
                      </div>
                    )}

                    {/* A photo that failed keeps its own retry, right on the
                        cell: the rest of the album already went through. */}
                    {message.failed && (
                      <button
                        type="button"
                        onClick={() => onRetry(message)}
                        className="absolute inset-0 flex flex-col items-center
                        justify-center gap-1 bg-destructive/80 text-[10px]
                        font-medium text-destructive-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Tentar novamente
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {last.delivery && (
              <button
                type="button"
                onClick={() => onOpenDelivery(last.delivery!.id)}
                className={cn(
                  "mt-1.5 flex w-full items-center gap-1.5 rounded-lg px-2",
                  "py-1.5 text-left text-xs transition-colors",
                  isOwnSide
                    ? "bg-primary-foreground/15 hover:bg-primary-foreground/25"
                    : "bg-background hover:bg-background/70",
                )}
              >
                <Package className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  Entrega: {last.delivery.recipient_name}
                </span>
              </button>
            )}

            {last.body && (
              <p
                className="mt-1 px-1 text-sm [overflow-wrap:anywhere]
                whitespace-pre-wrap"
              >
                {last.body}
              </p>
            )}

            <div
              className={cn(
                "mt-0.5 flex items-center justify-end gap-1 px-1",
                isOwnSide
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              <span className="text-[10px]">
                {formatClock(last.created_at)}
              </span>
              {renderChecks()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ImageAlbumBubble };
