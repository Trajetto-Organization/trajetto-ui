/**
 * What the AI quota card says (AI-10, AI-15). Pure, and tested.
 *
 * The card counted "verificações" while the unit is a photo — a checklist
 * with eight photos spends eight — did not say which records spent them, and
 * promised a reset "no dia 1º" that happened at 21:00 of the day before in
 * Brasília. The API now counts the month in the company's zone and answers
 * the breakdown and the exact reset instant; this turns them into words.
 */

interface PlanModule {
  module: string;
  enabled: boolean;
}

interface UsageByType {
  fuel: number;
  checklist: number;
  proof: number;
}

interface UsageRow {
  key: keyof UsageByType;
  label: string;
  count: number;
}

const ROW_LABELS: Record<keyof UsageByType, string> = {
  fuel: "Odômetros de abastecimentos",
  checklist: "Fotos de checklists",
  proof: "Canhotos de entrega",
};

/**
 * The breakdown, one row per kind the company can spend on: its modules'
 * kinds, plus any kind that spent something (a module switched off this
 * month still shows what it used). Unknown plan: every kind.
 */
function usageRows(
  byType: UsageByType | null | undefined,
  modules: readonly PlanModule[] | null | undefined,
): UsageRow[] {
  if (!byType) return [];

  const enabled = new Set(
    (modules ?? [])
      .filter((entry) => entry.enabled)
      .map((entry) => entry.module),
  );

  const known = modules !== null && modules !== undefined;

  const offered: Record<keyof UsageByType, boolean> = {
    fuel: !known || enabled.has("FLEET"),
    checklist: !known || enabled.has("FLEET"),
    proof: !known || enabled.has("DELIVERIES"),
  };

  return (Object.keys(ROW_LABELS) as Array<keyof UsageByType>)
    .filter((key) => offered[key] || byType[key] > 0)
    .map((key) => ({ key, label: ROW_LABELS[key], count: byType[key] }));
}

/** "12 fotos restantes neste período", "1 foto restante neste período". */
function remainingSentence(
  limit: number,
  used: number,
  inProgress: number,
): string {
  if (limit === 0) return "Verificação IA não habilitada para esta empresa";

  const remaining = limit - used - inProgress;

  if (remaining <= 0) return "Todas as fotos do período já foram usadas";

  return remaining === 1
    ? "1 foto restante neste período"
    : `${remaining.toLocaleString("pt-BR")} fotos restantes neste período`;
}

/** An instant as the company's clock shows it: "01/10/2026 às 00:00". */
function companyClock(
  iso: string,
  timeZone: string | null | undefined,
): string | null {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: timeZone || "America/Sao_Paulo",
    }).formatToParts(instant);

    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((entry) => entry.type === type)?.value ?? "";

    return `${part("day")}/${part("month")}/${part("year")} às ${part("hour")}:${part("minute")}`;
  } catch {
    return null;
  }
}

/** When the quota resets, in the company's zone, said so. */
function nextResetSentence(
  nextResetAt: string | null | undefined,
  timeZone: string | null | undefined,
): string {
  const when = nextResetAt ? companyClock(nextResetAt, timeZone) : null;

  // An API older than the instant: the rule, without a false precision.
  if (!when)
    return "A cota renova no dia 1º do próximo mês, à meia-noite no fuso da empresa";

  return `A cota renova em ${when} (fuso da empresa)`;
}

/** When the current period began, in the company's zone. */
function periodStartSentence(
  resetAt: string | null | undefined,
  timeZone: string | null | undefined,
): string | null {
  const when = resetAt ? companyClock(resetAt, timeZone) : null;

  return when ? `Período iniciado em ${when}` : null;
}

export {
  ROW_LABELS,
  companyClock,
  nextResetSentence,
  periodStartSentence,
  remainingSentence,
  usageRows,
};
export type { UsageRow };
