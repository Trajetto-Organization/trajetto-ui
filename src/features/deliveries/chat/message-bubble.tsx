"use client";

import Image from "next/image";

import {
  Check,
  CheckCheck,
  Clock,
  Megaphone,
  Package,
  RotateCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { ChatAudioPlayer } from "./audio-player";

import { resolveCheckState } from "./lib/check-state";
import { formatClock } from "./lib/format";
import { MEDIA_BUBBLE_WIDTH_CLASS } from "./lib/media-bubble";
import type { ClientChatMessage } from "./lib/types";

interface MessageBubbleProps {
  message: ClientChatMessage;

  /** True when the message belongs to this pane's side (the SAC team). */
  isOwnSide: boolean;

  /** Shown above the bubble when the author changes (another agent). */
  showSenderName: boolean;

  /** How far the other side has received — at or before = grey double. */
  counterpartDeliveredAt: string | null;

  /** How far the other side has read — at or before = blue double. */
  counterpartLastReadAt: string | null;

  onOpenDelivery: (deliveryId: string) => void;

  /**
   * The whole message, not its URL: the viewer opens on the conversation's
   * gallery and needs to know *which* photo this is. A bubble has no idea
   * where it sits in that list, so resolving the position is the
   * conversation's job — this only says which photo was tapped.
   */
  onOpenImage: (message: ClientChatMessage) => void;

  onRetry: (message: ClientChatMessage) => void;
}

/**
 * One message, WhatsApp-shaped: own side right in primary, the driver left
 * in muted. Checks are derived from the counterpart's delivery and read
 * cursors — there is no per-message receipt anywhere, so this is cheap and
 * always honest.
 */
const MessageBubble = ({
  message,
  isOwnSide,
  showSenderName,
  counterpartDeliveredAt,
  counterpartLastReadAt,
  onOpenDelivery,
  onOpenImage,
  onRetry,
}: MessageBubbleProps): JSX.Element => {
  const checkState = resolveCheckState({
    createdAt: message.created_at,
    pending: message.pending,
    counterpartDeliveredAt,
    counterpartLastReadAt,
  });

  // A photo in the bubble is what sets the bubble's width; see the constant.
  const hasImage = message.kind === "IMAGE" && Boolean(message.attachment_url);
  const hasAudio = message.kind === "AUDIO" && Boolean(message.attachment_url);

  const renderChecks = () => {
    if (!isOwnSide) return null;

    if (checkState === "pending") {
      return <Clock className="h-3 w-3 opacity-70" aria-label="Enviando" />;
    }

    if (message.failed) return null;

    if (checkState === "read") {
      return (
        <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Lida" />
      );
    }

    if (checkState === "delivered") {
      return (
        <CheckCheck className="h-3.5 w-3.5 opacity-70" aria-label="Entregue" />
      );
    }

    return <Check className="h-3.5 w-3.5 opacity-70" aria-label="Enviada" />;
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        isOwnSide ? "justify-end" : "justify-start",
      )}
    >
      {/*
        `min-w-0` is the load-bearing class in this file. A flex item defaults
        to `min-width: auto`, which floors it at the width of its own content
        — and the content here can be a single unbroken 500-character token.
        Without it the column below refuses to honour `max-w-[85%]`, grows past
        the pane and, because own-side messages are right-aligned, spills
        leftwards under the conversation sidebar.
      */}
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
            {message.sender.name}
          </span>
        )}

        {/*
          The bubble is shrink-to-fit (`items-end`/`items-start` opt out of
          stretching), and shrink-to-fit never goes below min-content. So the
          cap has to be repeated here: the parent being 85% wide does not stop
          this box from sizing itself to a word that is wider than the screen.
        */}
        <div
          className={cn(
            "max-w-full rounded-2xl px-3 py-2 shadow-sm",
            isOwnSide
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted",
            message.pending && "opacity-70",
          )}
        >
          {message.broadcast_id && (
            <span
              className={cn(
                "mb-1 flex items-center gap-1 text-[11px] font-medium",
                isOwnSide ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              <Megaphone className="h-3 w-3" />
              Aviso em massa
            </span>
          )}

          {message.delivery && (
            <button
              type="button"
              onClick={() => onOpenDelivery(message.delivery!.id)}
              className={cn(
                "mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-2",
                "py-1.5 text-left text-xs transition-colors",
                isOwnSide
                  ? "bg-primary-foreground/15 hover:bg-primary-foreground/25"
                  : "bg-background hover:bg-background/70",
              )}
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              {/* `truncate` is `white-space: nowrap`: without `min-w-0` the
                  recipient name becomes the bubble's minimum width. */}
              <span className="min-w-0 truncate">
                Entrega: {message.delivery.recipient_name}
              </span>
            </button>
          )}

          {hasImage && message.attachment_url && (
            <button
              type="button"
              onClick={() => onOpenImage(message)}
              className={cn(
                "mb-1 block overflow-hidden rounded-lg",
                MEDIA_BUBBLE_WIDTH_CLASS,
              )}
              aria-label="Ampliar imagem"
            >
              <Image
                src={message.attachment_url}
                alt="Foto enviada no chat"
                width={280}
                height={210}
                unoptimized
                className="h-auto max-h-64 w-full object-cover"
              />
            </button>
          )}

          {message.kind === "AUDIO" && message.attachment_url && (
            <ChatAudioPlayer
              src={message.attachment_url}
              durationMs={message.duration_ms}
              isOwnSide={isOwnSide}
            />
          )}

          {/*
            `overflow-wrap: anywhere` rather than Tailwind's `break-words`
            (`break-word`): both break a giant word to fit the line, but only
            `anywhere` also lowers the element's min-content width. That
            difference is the whole bug — `break-word` breaks the text
            visually while the box still measures itself against the unbroken
            word, and the box is what escapes the pane.
          */}
          {/*
            Under media the caption is a caption: it wraps at the media's
            width instead of stretching the bubble past it and leaving the
            photo — or the audio player — adrift on the left of an over-wide
            balloon.
          */}
          {message.body && (
            <p
              className={cn(
                "whitespace-pre-wrap text-sm [overflow-wrap:anywhere]",
                (hasImage || hasAudio) && MEDIA_BUBBLE_WIDTH_CLASS,
              )}
            >
              {message.body}
            </p>
          )}

          <div
            className={cn(
              "mt-0.5 flex items-center justify-end gap-1",
              isOwnSide ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            <span className="text-[10px]">
              {formatClock(message.created_at)}
            </span>
            {renderChecks()}
          </div>
        </div>

        {message.failed && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mt-1 flex items-center gap-1 px-1 text-xs font-medium
            text-destructive hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Não enviada — tentar de novo
          </button>
        )}
      </div>
    </div>
  );
};

export { MessageBubble };
