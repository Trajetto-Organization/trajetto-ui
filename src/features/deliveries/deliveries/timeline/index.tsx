"use client";

import {
  ArrowRight,
  Camera,
  Cpu,
  MapPin,
  Plug,
  Smartphone,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DELIVERY_STATUS_META } from "../../lib/status";

import type {
  AuthorizationTone,
  OccurrenceLineDetail,
} from "./occurrence-details";

import { KIND_META, timelineKindMeta } from "./kind-meta";

import type {
  TimelineActor,
  TimelineEntry,
} from "@/actions/delivery/get-delivery";

interface DeliveryTimelineProps {
  entries: TimelineEntry[];
  onPreviewImage?: (url: string, title: string) => void;
  /**
   * Per occurrence id: the form's answers and the tower's say (decisions
   * 6.2 and 6.3), shown under that occurrence's line.
   */
  occurrenceDetails?: Record<string, OccurrenceLineDetail>;
}

const AUTHORIZATION_TONE_CLASS: Record<AuthorizationTone, string> = {
  pending:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved:
    "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
  denied:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  superseded: "border-muted bg-muted text-muted-foreground",
};

const ACTOR_META: Record<
  TimelineActor,
  { icon: typeof UserRound; label: string }
> = {
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
const DeliveryTimeline = ({
  entries,
  onPreviewImage,
  occurrenceDetails = {},
}: DeliveryTimelineProps): JSX.Element => {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nada aconteceu com esta entrega ainda.
      </p>
    );
  }

  return (
    // min-w-0 plus overflow-wrap on every text line (DLV-OT-3): a long word
    // — an unbroken description, a URL, a note typed without spaces — wraps
    // inside the dialog instead of widening it into a sideways scroll.
    <ol className="relative min-w-0 space-y-4 pl-6">
      {/* The rail. Decorative, so it is hidden from assistive technology —
          the ordered list already carries the sequence. */}
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-[9px] top-2 w-px bg-border"
      />

      {entries.map((entry) => {
        // A kind newer than this screen gets a neutral line, never a crash.
        const meta = timelineKindMeta(entry.kind);
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
          <li key={entry.id} className="relative min-w-0">
            <span
              className="absolute -left-6 top-1 flex h-[19px] w-[19px]
              items-center justify-center rounded-full border bg-background"
            >
              <Icon className={`h-3 w-3 ${meta.tone}`} aria-hidden="true" />
            </span>

            <div className="min-w-0 space-y-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">
                  {entry.title}
                </span>

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
                <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {entry.detail}
                </p>
              )}

              {entry.kind === "OCCURRENCE" && occurrenceDetails[entry.id] && (
                <OccurrenceLineExtras detail={occurrenceDetails[entry.id]} />
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
                className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5
                text-xs text-muted-foreground [overflow-wrap:anywhere]"
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

/** The answers and the tower's say under an occurrence line. */
const OccurrenceLineExtras = ({
  detail,
}: {
  detail: OccurrenceLineDetail;
}): JSX.Element => (
  <div className="min-w-0 space-y-1.5">
    {detail.answers.length > 0 && (
      <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-0.5 rounded-md border p-2 text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
        {detail.answers.map((answer) => (
          <div key={answer.key} className="contents">
            <dt className="text-muted-foreground">{answer.label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {answer.value}
            </dd>
          </div>
        ))}
      </dl>
    )}

    {detail.authorization && (
      <p
        className={`min-w-0 break-words rounded-md border px-2 py-1 text-xs [overflow-wrap:anywhere] ${AUTHORIZATION_TONE_CLASS[detail.authorization.tone]}`}
      >
        {detail.authorization.label}
        {detail.authorization.note ? `: ${detail.authorization.note}` : ""}
      </p>
    )}
  </div>
);

export { DeliveryTimeline, KIND_META };
