import type { ChatMessageKind } from "@/actions/chat/chat.types";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Thread list time: clock today, "Ontem", else short date. */
function formatThreadTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (isSameDay(date, now)) return formatClock(iso);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, yesterday)) return "Ontem";

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** The centered pill between days of conversation. */
function formatDaySeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (isSameDay(date, now)) return "Hoje";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, yesterday)) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatLastSeen(lastSeenAt: string | null): string | null {
  if (!lastSeenAt) return null;

  const date = new Date(lastSeenAt);
  const now = new Date();

  if (isSameDay(date, now)) {
    return `visto por último hoje às ${formatClock(lastSeenAt)}`;
  }

  return `visto por último em ${date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })} às ${formatClock(lastSeenAt)}`;
}

/** The one-line preview of a message, for lists and search hits. */
function formatPreviewLine(kind: ChatMessageKind, body: string | null): string {
  if (body) return body;

  return kind === "AUDIO" ? "🎤 Mensagem de voz" : "📷 Foto";
}

/**
 * "0:42" from a raw second count — the running clock of the audio player,
 * where zero is a legitimate value and has to read as "0:00" rather than as
 * "no duration at all".
 */
function formatSecondsClock(totalSeconds: number): string {
  const safe =
    Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;

  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Initials for the avatar circle: "João da Silva" → "JS". */
function formatInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export {
  isSameDay,
  formatClock,
  formatThreadTime,
  formatDaySeparator,
  formatLastSeen,
  formatPreviewLine,
  formatSecondsClock,
  formatInitials,
};
