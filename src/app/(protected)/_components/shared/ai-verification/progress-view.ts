import type { AIAnalysisProgress } from "@/actions/ai-analysis";

/**
 * What the durable progress box says, and whether it keeps asking (AI-6).
 * Pure, and tested.
 *
 * It polled every 5 s and never looked at the status: an analysis that ended
 * while nobody listened on the socket (the admin on the web, the driver as
 * the requester) stayed "Analisando... 8 de 8 fotos" for as long as the
 * dialog was open. A terminal status now stops the polling and says how it
 * ended, and the screen reloads the record so the verdict takes its place.
 */

const TERMINAL_STATUSES = new Set<AIAnalysisProgress["status"]>([
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "SKIPPED",
  "none",
]);

interface ProgressView {
  label: string;
  percent: number;
  terminal: boolean;
  tone: "running" | "paused" | "done" | "failed";
}

/** How often the box asks while running, and while paused. */
const RUNNING_POLL_MS = 5_000;
const PAUSED_POLL_MS = 60_000;

function isTerminal(progress: AIAnalysisProgress | undefined): boolean {
  return Boolean(progress && TERMINAL_STATUSES.has(progress.status));
}

/**
 * A request the provider refused service to (spend limit, own usage limit,
 * credentials) — or one queued behind it, which the circuit keeps from being
 * claimed: back in the queue, not failed (AI-8). The API says so in
 * `paused`; the box used to guess it from a prefix of the error's free text,
 * and missed every request queued during the outage.
 */
function isPaused(progress: AIAnalysisProgress | undefined): boolean {
  return Boolean(
    progress && progress.status === "PENDING" && progress.paused === true,
  );
}

/**
 * The poll interval: none once it ended, slow while paused — a spend limit
 * can hold the queue for hours, and asking every 5 s changes nothing.
 */
function pollInterval(
  progress: AIAnalysisProgress | undefined,
): number | false {
  if (isTerminal(progress)) return false;

  return isPaused(progress) ? PAUSED_POLL_MS : RUNNING_POLL_MS;
}

function progressView(
  progress: AIAnalysisProgress | undefined,
  now: number = Date.now(),
): ProgressView {
  if (!progress) {
    return {
      label: "Analisando...",
      percent: 8,
      terminal: false,
      tone: "running",
    };
  }

  const counted =
    progress.unitsTotal > 0
      ? Math.round((progress.unitsCompleted / progress.unitsTotal) * 100)
      : 0;

  switch (progress.status) {
    case "COMPLETED":
      return {
        label: "Análise concluída. Atualizando o resultado...",
        percent: 100,
        terminal: true,
        tone: "done",
      };

    case "PARTIAL":
      return {
        label: `Análise concluída em parte (${progress.unitsCompleted} de ${progress.unitsTotal} fotos). Atualizando o resultado...`,
        percent: Math.max(8, counted),
        terminal: true,
        tone: "done",
      };

    case "FAILED":
      return {
        label: "A análise não pôde ser concluída.",
        percent: Math.max(8, counted),
        terminal: true,
        tone: "failed",
      };

    // Why, in the API's words: the period's quota, or a photo replaced
    // before it was read (whose new photo has its own analysis).
    case "SKIPPED":
      return {
        label: progress.lastError
          ? `Análise não realizada. ${progress.lastError}`
          : "Análise não realizada.",
        percent: 0,
        terminal: true,
        tone: "failed",
      };

    case "none":
      return {
        label: "Nenhuma análise em andamento.",
        percent: 0,
        terminal: true,
        tone: "done",
      };

    default:
      break;
  }

  // Said as paused, not "Analisando...": nothing is being read, and the
  // reading resumes by itself when the provider takes calls again.
  if (isPaused(progress)) {
    return {
      label:
        "Leitura pausada: o provedor de IA recusou o serviço; será retomada automaticamente.",
      percent: progress.unitsTotal > 0 ? Math.max(8, counted) : 8,
      terminal: false,
      tone: "paused",
    };
  }

  const isWaitingRetry =
    progress.status === "PENDING" &&
    progress.availableAt !== null &&
    new Date(progress.availableAt).getTime() > now;

  const label = isWaitingRetry
    ? `Aguardando nova tentativa (${progress.unitsCompleted}/${progress.unitsTotal} fotos analisadas)`
    : progress.unitsTotal > 1
      ? `Analisando... ${progress.unitsCompleted} de ${progress.unitsTotal} fotos`
      : "Analisando...";

  return {
    label,
    percent: progress.unitsTotal > 0 ? Math.max(8, counted) : 8,
    terminal: false,
    tone: "running",
  };
}

export {
  PAUSED_POLL_MS,
  RUNNING_POLL_MS,
  TERMINAL_STATUSES,
  isPaused,
  isTerminal,
  pollInterval,
  progressView,
};
export type { ProgressView };
