/**
 * The footer line of "Custos de Manutenção". Pure, and tested.
 *
 * It compared the LAST point with the one before and called it "no período",
 * while the last point is always the month (or the day) still running — so a
 * month half done read as a "Redução de 50% no período". And an increase of
 * cost was drawn as a green arrow. It now names both points, says the last
 * one is in progress, and colours a rise in cost as a warning.
 */

interface CostPoint {
  month?: string;
  date?: string;
  internal: number;
  external: number;
}

type CostTrend = "up" | "down" | "flat" | "none";

interface CostComparison {
  trend: CostTrend;
  /** Rounded change of the running point over the previous one. */
  percent: number | null;
  text: string;
}

const labelOf = (point: CostPoint): string => point.month || point.date || "";

function costComparison(points: readonly CostPoint[]): CostComparison {
  if (points.length < 2) {
    return {
      trend: "none",
      percent: null,
      text: "Sem período anterior para comparar",
    };
  }

  const current = points[points.length - 1];
  const previous = points[points.length - 2];

  const currentTotal = current.internal + current.external;
  const previousTotal = previous.internal + previous.external;

  const head = `${labelOf(current)} (em andamento) × ${labelOf(previous)}`;

  if (previousTotal === 0 && currentTotal === 0) {
    return {
      trend: "flat",
      percent: 0,
      text: `${head}: sem custos nos dois períodos`,
    };
  }

  // No base: a percentage over zero means nothing, and "sem variação" was
  // false whenever the running point already had costs.
  if (previousTotal === 0) {
    return {
      trend: "none",
      percent: null,
      text: `${head}: sem custos em ${labelOf(previous)} para comparar`,
    };
  }

  const percent = Math.round(
    ((currentTotal - previousTotal) / previousTotal) * 100,
  );

  if (percent > 0) {
    return { trend: "up", percent, text: `${head}: aumento de ${percent}%` };
  }

  if (percent < 0) {
    return {
      trend: "down",
      percent,
      text: `${head}: redução de ${Math.abs(percent)}%`,
    };
  }

  return { trend: "flat", percent: 0, text: `${head}: sem variação` };
}

export { costComparison };
export type { CostComparison, CostTrend };
