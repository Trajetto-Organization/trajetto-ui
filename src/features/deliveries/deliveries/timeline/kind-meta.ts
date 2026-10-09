import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  MapPin,
  MessageSquare,
  Navigation,
  Route,
  RouteOff,
  StickyNote,
} from "lucide-react";

import type { TimelineKind } from "@/actions/delivery/get-delivery";

interface TimelineKindMeta {
  icon: typeof MapPin;
  tone: string;
  label: string;
}

/** Icon, tone and label of each kind the API sends for the timeline. */
const KIND_META: Record<TimelineKind, TimelineKindMeta> = {
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
  ON_THE_WAY: {
    icon: Navigation,
    tone: "text-sky-600 dark:text-sky-400",
    label: "A caminho",
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
  // Decision 14.7: planning facts. The note names the route and stays as the
  // line's detail.
  ROUTE_ADDED: {
    icon: Route,
    tone: "text-muted-foreground",
    label: "Adicionada à rota",
  },
  ROUTE_REMOVED: {
    icon: RouteOff,
    tone: "text-muted-foreground",
    label: "Retirada da rota",
  },
};

/**
 * What a line looks like for a kind newer than this screen: a neutral dot.
 * An API that learns a new kind must not take the delivery dialog down.
 */
const FALLBACK_META: TimelineKindMeta = {
  icon: Circle,
  tone: "text-muted-foreground",
  label: "Evento",
};

function timelineKindMeta(kind: string): TimelineKindMeta {
  return Object.prototype.hasOwnProperty.call(KIND_META, kind)
    ? KIND_META[kind as TimelineKind]
    : FALLBACK_META;
}

export { KIND_META, FALLBACK_META, timelineKindMeta };
export type { TimelineKindMeta };
