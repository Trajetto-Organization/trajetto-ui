import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
  onClick?: () => void;
}

interface StatsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Interface for configuring an individual stat
 */
interface StatConfig {
  /** Unique key to identify the stat */
  key: string;
  /** Card title */
  title: string;
  /** Field in the data object that contains the value */
  valueKey: string;
  /** Optional description */
  description?: string;
  /** lucide-react icon */
  icon?: LucideIcon;
  /** Variante de cor */
  variant?: StatCardProps["variant"];
  /** Trend setting */
  trend?: {
    /** Field in the data object that contains the trend value */
    valueKey?: string;
    /** Fixed trend value (if not using valueKey) */
    value?: number;
    /** Label da trend */
    label?: string;
  };
  /** Custom function to format the value */
  formatValue?: (value: any, data: any) => string | number;
  /** Custom function to calculate the value */
  calculateValue?: (data: any) => string | number;
  /** Action when clicking on the card */
  onClick?: () => void;
}

/**
 * PageStats Component Props
 */
interface PageStatsProps {
  /** Setting the stats to be displayed */
  stats: StatConfig[];
  /** API fetch data */
  data: Record<string, any>;
  /** Loading status */
  isLoading?: boolean;
  /** Number of grid columns (default: 4) */
  columns?: 1 | 2 | 3 | 4;
  /** Additional CSS Classes */
  className?: string;
}

export type { StatCardProps, StatConfig, PageStatsProps, StatsGridProps };
