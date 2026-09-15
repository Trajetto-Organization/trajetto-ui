"use client";

import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Cpu,
  MapPin,
  MessageSquare,
  Plug,
  Smartphone,
  StickyNote,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DELIVERY_STATUS_META } from "../../lib/status";

import type {
  TimelineActor,
  TimelineEntry,
  TimelineKind,
} from "@/actions/delivery/get-delivery";

interface DeliveryTimelineProps {
  entries: TimelineEntry[];
  onPreviewImage?: (url: string, title: string) => void;
}

/**
 * Everything that ever happened to one delivery, in the order it happened.
 *
 * This is the screen support opens while the customer is on the phone, so it
 * is built for reading rather than for auditing: one line per fact, newest
 * first, with who did it and from where. The titles come from the API already
 * phrased — re-deriving them here would let the sentence the SAC reads drift
 * from the one the driver's app shows.
 *
 * The photos are the same signed URLs the proof tab uses. A timeline that
 * described a photo without showing it would send somebody to another tab to
 * answer the question they are being asked right now.
 */
const KIND_META: Record<
  TimelineKind,
  { icon: typeof MapPin; tone: string; label: string }
> = {
  ARRIVAL: {
    icon: MapPin,
    tone: "text-sky-600 dark:text-sky-400",
    label: "Chegada",
  },
  PROOF: {
    icon: CheckCircle2,
    tone: "text-emerald-600 dark:text-emerald-400",
    label: "Comprovação",
  },
  STATUS_CHANGE: {
    icon: ArrowRight,
    tone: "text-amber-600 dark:text-amber-400",
    label: "Status",
  },
  NOTE: {
    icon: StickyNote,
    tone: "text-muted-foreground",
    label: "Anotação",
  },
  OCCURRENCE: {
    icon: AlertTriangle,
    tone: "text-red-600 dark:text-red-500",
    label: "Ocorrência",
  },
  MESSAGE: {
    icon: MessageSquare,
    tone: "text-violet-600 dark:text-violet-400",
    label: "Mensagem",
  },
};

const ACTOR_META: Record<TimelineActor, { icon: typeof UserRound; label: string }> =
  {
    USER: { icon: UserRound, label: "painel" },
    DRIVER_APP: { icon: Smartphone, label: "app do motorista" },
    INTEGRATION: { icon: Plug, label: "integração" },
    SYSTEM: { icon: Cpu, label: "sistema" },
  };

/** "16/09/2026 14:32" — the format the person reading it writes dates in. */
const formatMoment = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const DeliveryTimeline = ({
  entries,
  onPreviewImage,
}: DeliveryTimelineProps): JSX.Element => {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nada aconteceu com esta entrega ainda.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 pl-6">
      {/* The rail. Decorative, so it is hidden from assistive technology —
          the ordered list already carries the sequence. */}
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-[9px] top-2 w-px bg-border"
      />

      {entries.map((entry) => {
        const meta = KIND_META[entry.kind];
        const Icon = meta.icon;

        const actor = ACTOR_META[entry.author.kind];
        const ActorIcon = actor.icon;

        const from = entry.statusFrom
          ? DELIVERY_STATUS_META[entry.statusFrom]?.label
          : null;
        const to = entry.statusTo
          ? DELIVERY_STATUS_META[entry.statusTo]?.label
          : null;

        return (
          <li key={entry.id} className="relative">
            <span
              className="absolute -left-6 top-1 flex h-[19px] w-[19px]
              items-center justify-center rounded-full border bg-background"
            >
              <Icon className={`h-3 w-3 ${meta.tone}`} aria-hidden="true" />
            </span>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{entry.title}</span>

                {entry.blocking && (
                  <Badge variant="destructive" className="h-5 text-[11px]">
                    Barra a entrega
                  </Badge>
                )}
              </div>

              {from && to && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{from}</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  <span className="font-medium text-foreground">{to}</span>
                </p>
              )}

              {entry.detail && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {entry.detail}
                </p>
              )}

              {entry.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {entry.photos.map((photo, index) => (
                    <button
                      key={photo}
                      type="button"
                      onClick={() => onPreviewImage?.(photo, entry.title)}
                      className="group relative h-16 w-16 overflow-hidden
                      rounded-md border focus:outline-none focus-visible:ring-2
                      focus-visible:ring-ring"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`${entry.title} — imagem ${index + 1}`}
                        className="h-full w-full object-cover transition
                        group-hover:scale-105"
                      />
                      <span
                        className="absolute inset-0 hidden items-center
                        justify-center bg-black/40 group-hover:flex"
                      >
                        <Camera
                          className="h-4 w-4 text-white"
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <p
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5
                text-xs text-muted-foreground"
              >
                <time dateTime={entry.at}>{formatMoment(entry.at)}</time>

                <span aria-hidden="true">·</span>

                <span className="inline-flex items-center gap-1">
                  <ActorIcon className="h-3 w-3" aria-hidden="true" />
                  {entry.author.name ?? actor.label}
                </span>

                {entry.author.device && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{entry.author.device}</span>
                  </>
                )}

                {entry.location && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={`https://www.google.com/maps?q=${entry.location.latitude},${entry.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline
                      underline-offset-2 hover:text-foreground"
                    >
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      Ver no mapa
                    </a>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export { DeliveryTimeline, KIND_META };
