interface StatCardProps {
  title: string;
  icon: JSX.Element;
  color: string;
  change: number;
  value: number;
  /** Short caption after the percentage (lib/dashboard-counts comparisonLabel). */
  comparison?: string;
  /** The full sentence, shown on hover (lib/dashboard-counts comparisonDescription). */
  comparisonTitle?: string;
}

export type { StatCardProps };
