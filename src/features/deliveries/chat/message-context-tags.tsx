"use client";

import { Filter, Route } from "lucide-react";

import { cn } from "@/lib/utils";

import { routeLabel } from "./lib/chat-link";
import type { ChatHistoryFilter, ClientChatMessage } from "./lib/types";

interface MessageContextTagsProps {
  message: Pick<ClientChatMessage, "route" | "delivery">;
  isOwnSide: boolean;

  /** Absent: the tags are text only (a screen that does not filter). */
  onFilter?: (filter: ChatHistoryFilter) => void;
}

/**
 * The route a message was said during, and a way to see only its route's
 * or its delivery's messages (decision 6.7).
 *
 * The delivery chip above keeps opening the delivery; the filter is a
 * separate control so neither click changes meaning.
 */
const MessageContextTags = ({
  message,
  isOwnSide,
  onFilter,
}: MessageContextTagsProps): JSX.Element | null => {
  const route = message.route ?? null;
  const delivery = message.delivery;

  if (!route && !(delivery && onFilter)) return null;

  const tone = isOwnSide
    ? "bg-primary-foreground/15 hover:bg-primary-foreground/25"
    : "bg-background hover:bg-background/70";

  const routeText = route
    ? `${routeLabel(route.code)}${route.name ? ` · ${route.name}` : ""}`
    : "";

  return (
    <div className="mb-1.5 flex min-w-0 flex-wrap gap-1">
      {route &&
        (onFilter ? (
          <button
            type="button"
            onClick={() =>
              onFilter({
                kind: "route",
                id: route.id,
                label: routeLabel(route.code),
              })
            }
            className={cn(
              "flex min-w-0 max-w-full items-center gap-1 rounded-md px-1.5",
              "py-0.5 text-[11px] transition-colors",
              tone,
            )}
            aria-label={`Ver só as mensagens da ${routeLabel(route.code)}`}
            title="Ver só as mensagens desta rota"
          >
            <Route className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{routeText}</span>
          </button>
        ) : (
          <span
            className={cn(
              "flex min-w-0 max-w-full items-center gap-1 rounded-md px-1.5",
              "py-0.5 text-[11px]",
              isOwnSide ? "bg-primary-foreground/15" : "bg-background",
            )}
          >
            <Route className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{routeText}</span>
          </span>
        ))}

      {delivery && onFilter && (
        <button
          type="button"
          onClick={() =>
            onFilter({
              kind: "delivery",
              id: delivery.id,
              label: delivery.recipient_name,
            })
          }
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]",
            "transition-colors",
            tone,
          )}
          aria-label={`Ver só as mensagens da entrega de ${delivery.recipient_name}`}
          title="Ver só as mensagens desta entrega"
        >
          <Filter className="h-3 w-3 shrink-0" />
          Só desta entrega
        </button>
      )}
    </div>
  );
};

export { MessageContextTags };
