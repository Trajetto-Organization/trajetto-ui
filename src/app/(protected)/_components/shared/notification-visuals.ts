import {
  Bell,
  CircleAlert,
  KanbanSquare,
  Receipt,
  UserRound,
  Wrench,
} from "lucide-react";

/**
 * The one visual vocabulary for notifications — bell dropdown and the
 * /notifications page read from here, so a new type gets its color exactly
 * once and both surfaces stay in step.
 */

/**
 * The accent that says "you have something" — the same #f50057 the account
 * menu already uses for its notification count.
 */
const NOTIFICATION_ACCENT_CLASS = "bg-[#f50057]";

interface NotificationTypeVisual {
  icon: React.ComponentType<{ className?: string }>;

  /** Soft background + icon color pair, legible in both themes. */
  chip: string;
}

const NOTIFICATION_TYPE_VISUAL: Record<string, NotificationTypeVisual> = {
  fine: {
    icon: CircleAlert,
    chip: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  "service-order": {
    icon: Wrench,
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "account-payable": {
    icon: Receipt,
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "kanban-card": {
    icon: KanbanSquare,
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  "master-user": {
    icon: UserRound,
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
};

const DEFAULT_NOTIFICATION_VISUAL: NotificationTypeVisual = {
  icon: Bell,
  chip: "bg-muted text-primary",
};

function getNotificationVisual(type: string): NotificationTypeVisual {
  return NOTIFICATION_TYPE_VISUAL[type] ?? DEFAULT_NOTIFICATION_VISUAL;
}

/** Full date for the archive page; the bell shows relative time instead. */
function formatNotificationDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export {
  NOTIFICATION_ACCENT_CLASS,
  NOTIFICATION_TYPE_VISUAL,
  DEFAULT_NOTIFICATION_VISUAL,
  getNotificationVisual,
  formatNotificationDate,
};

export type { NotificationTypeVisual };
